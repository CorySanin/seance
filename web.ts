import * as http from "http";
import crypto from 'crypto';
import type { Express } from "express";
import express from 'express';
import bodyParser from 'body-parser';
import Recaptcha from 'express-recaptcha';
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const CSPNONCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

interface ContactFormForGhostConfig {
    port?: number;
    allowedHosts?: string[];
    recaptchaKey?: string;
    recaptchaSecret?: string;
    smtp?: SMTPTransport | SMTPTransport.Options;
    senderAddress?: string;
    recipientAddress?: string;
    subject?: string;
}

/**
 * I still hate typescript.
 */
function notStupidParseInt(v: string | undefined): number {
    return v === undefined ? NaN : parseInt(v);
}

function genNonceForCSP(length: number = 16): string {
    let bytes = crypto.randomBytes(length);
    let chars = [];
    for (let i = 0; i < bytes.length; i++) {
        chars.push(CSPNONCE[bytes[i] % CSPNONCE.length]);
    }
    return chars.join('');
}


export default class Web {
    private _webserver: http.Server | null = null;

    constructor(options: ContactFormForGhostConfig = {}) {
        const app: Express = express();
        const port: number = notStupidParseInt(process.env.PORT) || options['port'] as number || 8080;
        const VIEWOPTIONS = {
            outputFunctionName: 'echo'
        };
        const allowedHosts = (process.env.ALLOWEDHOSTS || (options.allowedHosts || ['*']).join(' '));
        const emailValidator = /^[^@\s]+@[^@.\s]+\.[^@\s]+$/;
        const emailTransport = nodemailer.createTransport(options.smtp);
        const recaptchaKey = process.env.RECAPTCHAKEY || options.recaptchaKey;
        const recaptchaSecret = process.env.RECAPTCHASECRET || options.recaptchaSecret;
        const recaptcha = (recaptchaKey && recaptchaSecret) ? new Recaptcha.RecaptchaV2(recaptchaKey, recaptchaSecret, { checkremoteip: true }) : null;

        const throwIfUndefined = <T>(value: T | undefined, errorMessage: string): T => {
            if (value === undefined) {
                throw new Error(errorMessage);
            }
            return value;
        }

        const senderAddress: string = throwIfUndefined(process.env.SENDERADDRESS || options.senderAddress || options.smtp?.auth?.user, 'senderAddress is required');
        const recipientAddress: string = throwIfUndefined(process.env.RECIPIENTADDRESS || options.recipientAddress, 'recipientAddress is required');
        const subject: string = process.env.SUBJECT || options.subject || 'Form submission';

        app.set('trust proxy', 1);
        app.set('view engine', 'ejs');
        app.set('view options', VIEWOPTIONS);
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use('/assets', express.static('assets'));

        app.get('/', (req, res) => {
            let nonce = genNonceForCSP();
            res.render('index',
                {
                    nonce,
                    recaptcha: recaptchaKey,
                    dark: !!req.query.dark
                },
                function (err, html) {
                    if (!err) {
                        res.set('Content-Security-Policy', `frame-ancestors 'self' ${allowedHosts}; default-src 'self' https://www.google.com; connect-src 'self' *; script-src 'self' 'nonce-${nonce}'`);
                        res.send(html);
                    }
                    else {
                        console.error(err);
                        res.status(500).send('Something went wrong. Please try again later.');
                    }
                });
        });

        const createPageRenderer = (res: express.Response) => {
            return (err: Error, html: string) => {
                if (!err) {
                    res.set('Content-Security-Policy', `frame-ancestors 'self' ${allowedHosts}; default-src 'self'; connect-src 'self' *; script-src 'self'`);
                    res.send(html);
                }
                else {
                    console.error(err);
                    res.status(500).send('Something went wrong. Please try again later.');
                }
            }
        }

        let sendMail = async (req: express.Request, res: express.Response, next?: express.NextFunction) => {
            const renderPage = createPageRenderer(res);

            if (req?.body?.email && req.body.name && req.body.message && emailValidator.test(req.body.email)) {
                try {
                    console.log(await emailTransport.sendMail({
                        to: recipientAddress,
                        from: `Seance <${senderAddress}>`,
                        replyTo: req.body.email,
                        subject: `${subject} from ${req.body.name}`,
                        text: req.body.message
                    }));
                    res.render('result',
                        {
                            dark: !!req.query.dark,
                            header: 'Message sent',
                            text: 'Your message has been received. Thank you!'
                        },
                        renderPage
                    );
                }
                catch (err) {
                    console.error('Failed to send email', err);
                    res.status(500);
                    res.render('result',
                        {
                            dark: !!req.query.dark,
                            header: 'Error',
                            text: 'An error occurred while attempting to deliver your message. Try again later.'
                        },
                        renderPage
                    );
                }
            }
            else {
                res.status(400);
                res.render('result',
                    {
                        dark: !!req.query.dark,
                        header: 'Error',
                        text: 'There was something wrong with the form you submitted. Go back and try again.'
                    },
                    renderPage
                );
            }

            next && next();
        }

        if (recaptchaKey) {
            app.post('/', (recaptcha as Recaptcha.RecaptchaV2).middleware.verify, (req, res) => {
                if (!!req.recaptcha && !req.recaptcha.error) {
                    sendMail(req, res);
                }
                else {
                    res.status(400);
                    res.render('result',
                        {
                            dark: !!req.query.dark,
                            header: 'Error',
                            text: 'There was something wrong with the form you submitted. Go back and try again.'
                        },
                        createPageRenderer(res)
                    );
                }
            });
        }
        else {
            app.post('/', sendMail);
        }

        emailTransport.verify((err, success) => {
            if (success) {
                this._webserver = app.listen(port, () => console.log(`seance running on port ${port}`));
            }
            else {
                console.error(err);
            }
        });
    }

    close = () => {
        if (this._webserver) {
            this._webserver.close();
        }
    }
}