import * as http from "http";
import crypto from 'crypto';
import type { Express } from "express";
import express from 'express';
import { rateLimit, MemoryStore, type Options as LimiterOptions } from 'express-rate-limit';
import Recaptcha from 'express-recaptcha';
import * as HCaptcha from 'hcaptcha';
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

interface ContactFormForGhostConfig {
    port?: number;
    allowedHosts?: string[];
    recaptchaKey?: string;
    recaptchaSecret?: string;
    hCaptchaKey?: string;
    hCaptchaSecret?: string;
    smtp?: SMTPTransport | SMTPTransport.Options;
    senderAddress?: string;
    recipientAddress?: string;
    subject?: string;
    limiter?: Partial<LimiterOptions>;
}

/**
 * I still hate typescript.
 */
function notStupidParseInt(v: string | undefined): number {
    return v === undefined ? NaN : parseInt(v);
}

function cspGen(_: express.Request, res: express.Response, next: express.NextFunction) {
    crypto.randomBytes(32, (err, randomBytes) => {
        if (err) {
            console.error(err);
            next && next(err);
        } else {
            res.locals.cspNonce = randomBytes.toString("hex");
            next && next();
        }
    });
}

function setDefaultLimits(options: Partial<LimiterOptions>): Partial<LimiterOptions> {
    options.windowMs ||= 50000;
    options.limit ||= 3;
    options.legacyHeaders ||= false;
    options.store = new MemoryStore();
    const messageText = options.message || 'Too many requests, please try again later.';
    options.message = (req: express.Request, res: express.Response) => {
        return new Promise((resolve, reject) => {
            res.render('rate-limit', {
                text: messageText,
                dark: req?.query?.dark && req.query.dark != 'false'
            }, (err, html) => {
                if (!err) {
                    resolve(html);
                }
                else {
                    console.error(err);
                    reject('Something went wrong. Please try again later.');
                }
            });
        });
    }
    return options;
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
        const hCaptchaKey = process.env.HCAPTCHAKEY || options.hCaptchaKey;
        const recaptchaSecret = process.env.RECAPTCHASECRET || options.recaptchaSecret;
        const hCaptchaSecret = process.env.HCAPTCHASECRET || options.hCaptchaSecret;
        const recaptcha = (recaptchaKey && recaptchaSecret) ? new Recaptcha.RecaptchaV2(recaptchaKey, recaptchaSecret, { checkremoteip: true }) : null;
        const hCaptcha = hCaptchaKey && hCaptchaSecret;
        const limiter = rateLimit(setDefaultLimits(options?.limiter || {}));
        const formParser = express.urlencoded({ extended: true });

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
        app.use('/assets', express.static('assets'));
        app.use(cspGen);

        app.get('/', (req, res) => {
            const domain = `${req.protocol}://${req.headers.host}`;
            const nonce = res.locals.cspNonce;
            res.render('index',
                {
                    nonce,
                    recaptcha: recaptchaKey,
                    hCaptcha: hCaptchaKey,
                    domain,
                    url: `${domain}${req.url}`,
                    dark: req?.query?.dark && req.query.dark != 'false'
                },
                function (err, html) {
                    if (!err) {
                        res.set('Content-Security-Policy', `frame-ancestors 'self' ${allowedHosts}; default-src 'self' https://www.google.com https://*.hcaptcha.com; connect-src 'self' *; script-src 'self' 'nonce-${nonce}'`);
                        res.send(html);
                    }
                    else {
                        console.error(err);
                        res.status(500).send('Something went wrong. Please try again later.');
                    }
                });
        });

        app.get('/services/oembed{/}', (req, res) => {
            const defaultWidth = 720;
            const defaultHeight = 600;
            const urlParam = req.query?.url;
            const url = urlParam && typeof urlParam === 'string' && new URL(urlParam);
            const domain = `${req.protocol}://${req.headers.host}`;
            if (!url || url.pathname !== '/') {
                res.status(404).json({
                    success: false
                });
            }
            else if ('format' in req.query && (req.query.format as string).toLowerCase() !== 'json') {
                res.status(501).send('oEmbed response is JSON only.');
            }
            else {
                const width = Math.min(defaultWidth, parseInt(typeof req.query.maxwidth === 'string' && req.query.maxwidth || `${defaultWidth}`));
                const height = Math.min(defaultHeight, parseInt(typeof req.query.maxheight === 'string' && req.query.maxheight || `${defaultHeight}`));
                res.json({
                    success: true,
                    type: 'rich',
                    version: '1.0',
                    width,
                    height,
                    html: `<iframe width="${width}" height="${height}" src="${domain}${url.pathname}${url.search}" frameBorder="0" style="max-width:100%"></iframe>`
                });
            }
        });

        const createPageRenderer = (res: express.Response) => {
            return (err: Error, html: string) => {
                if (!err) {
                    res.set('Content-Security-Policy', `frame-ancestors 'self' ${allowedHosts}; default-src 'self'; connect-src 'self' *; script-src 'self';`);
                    res.send(html);
                }
                else {
                    console.error(err);
                    res.status(500).send('Something went wrong. Please try again later.');
                }
            }
        }

        const sendError = (req: express.Request, res: express.Response) => {
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

        const sendMail = async (req: express.Request, res: express.Response) => {
            const renderPage = createPageRenderer(res);
            const dark = req?.query?.dark && req.query.dark != 'false';
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
                            dark,
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
                            dark,
                            header: 'Error',
                            text: 'An error occurred while attempting to deliver your message. Try again later.'
                        },
                        renderPage
                    );
                }
            }
            else {
                console.error('Form data failed to validate:', req.body);
                sendError(req, res);
            }
        }

        app.post('/', limiter, formParser);
        if (recaptchaKey) {
            app.post('/', (recaptcha as Recaptcha.RecaptchaV2).middleware.verify, (req, res, next) => {
                if (!!req.recaptcha && !req.recaptcha.error) {
                    next();
                }
                else {
                    sendError(req, res);
                }
            });
        }
        else if (hCaptcha) {
            app.post('/', async (req, res, next) => {
                const data = await HCaptcha.verify(hCaptchaSecret, req?.body['h-captcha-response']);
                if (data.success === true) {
                    next();
                }
                else {
                    sendError(req, res);
                }
            });
        }
        app.post('/', sendMail);

        app.get('/healthcheck', (_, res) => {
            res.send('Healthy');
        });

        this._webserver = app.listen(port, () => console.log(`seance running on port ${port}`));

        emailTransport.verify((err, success) => {
            if (err || !success) {
                console.error('Failed establishing connectiong to SMTP server', err);
                process.exit(25);
            }
            else {
                console.log('SMPT configuration verified');
            }
        });
    }

    close = () => {
        if (this._webserver) {
            this._webserver.close();
        }
    }
}
