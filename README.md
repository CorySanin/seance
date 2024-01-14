# Seance for Ghost

Self-hostable contact form service for Ghost blogs. Or any other application you can think of. The limit is in your mind.

## Install and run

```bash
bun install
```

To run:

```bash
bun run index.ts [path/to/config.json5]
```

## Configuration

Seance takes a JSON or JSON5 config file (default location is config/config.json):

```
{
    // The port the web server will run on (default 8080)
    "port": number,
    // Array of hosts allowed to embed the contact form. Default is to allow all (not recommended)
    allowedHosts: string[],
    // If using reCAPTCHA, provide the site key
    recaptchaKey: string,
    // If using reCAPTCHA, provide the site secret
    recaptchaSecret: string,
    // The Nodemailer transport configuration. See https://nodemailer.com/smtp/
    smtp: SMTPTransport | SMTPTransport.Options,
    // The address to send emails from. Defaults to the smtp username
    senderAddress: string,
    // The address to send emails to
    recipientAddress: string,
    // The subject prefix for all mail sent using this form. Default is "Form submission"
    subject: string,
}
```

## Ghost Installation

WIP