# Seance for Ghost

Self-hostable contact form service for Ghost blogs. Or any other applications you can think of. The limit is in your mind.

Add a contact form to your Ghost site without a subscription!

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/CorySanin/seance/master/assets/images/screenshot_dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/CorySanin/seance/master/assets/images/screenshot_light.png">
  <img alt="Seance embedded in a Ghost page" src="https://raw.githubusercontent.com/CorySanin/seance/master/assets/images/screenshot_light.png">
</picture>

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

Create a page for your contact form. Add an "Other" embed section. Enter your Seance instance's URL:

```
https://contact.example.com/?dark=false
```

If you're using a dark theme you can change the `dark` parameter to `true`. Note that the dark mode may look weird in the editor. It will look better on the live site.