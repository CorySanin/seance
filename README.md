![Seance for Ghost](/assets/logo/seance-logo.png "Seance for Ghost")

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CorySanin/seance/.github%2Fworkflows%2Fbuild_docker_image.yml)](https://github.com/CorySanin/seance/actions)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/CorySanin/seance)](https://github.com/CorySanin/seance)
[![GitHub Release](https://img.shields.io/github/v/release/CorySanin/seance)](https://github.com/CorySanin/seance/releases/latest)
[![GitHub Release Date](https://img.shields.io/github/release-date-pre/CorySanin/seance)](https://github.com/CorySanin/seance/releases/latest)
[![Docker Pulls](https://img.shields.io/docker/pulls/corysanin/seance)](https://hub.docker.com/r/corysanin/seance)
[![GitHub License](https://img.shields.io/github/license/CorySanin/seance)](/LICENSE)


# Seance for Ghost

Self-hostable contact form service for Ghost blogs. Or any other applications you can think of. The limit is in your mind.

Add a contact form to your Ghost site without a subscription! Supports captchas from reCAPTCHA and hCaptcha.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/CorySanin/seance/master/assets/images/screenshot_dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/CorySanin/seance/master/assets/images/screenshot_light.png">
  <img alt="Seance embedded in a Ghost page" src="https://raw.githubusercontent.com/CorySanin/seance/master/assets/images/screenshot_light.png">
</picture>

## Install and run

```bash
npm install
npm run build
```

To run:

```bash
npm run start
```

A docker image `ghcr.io/corysanin/seance` is provided. A list of tags is available [here](https://github.com/CorySanin/seance/pkgs/container/seance/versions?filters%5Bversion_type%5D=tagged). 
See [docker-compose.yml](/docker-compose.yml).

## Configuration

Seance takes a JSON or JSON5 config file (default location is config/config.json5):

```
{
    // The port the web server will run on (default 8080)
    "port": number,
    // Array of hosts allowed to embed the contact form.
    // Default is to allow all (not recommended)
    allowedHosts: string[],
    // If using reCAPTCHA, provide the site key
    recaptchaKey: string,
    // If using reCAPTCHA, provide the site secret
    recaptchaSecret: string,
    // If using hCaptcha, provide the site key
    hCaptchaKey: string,
    // If using hCaptcha, provide the account secret
    hCaptchaSecret: string,
    // The Nodemailer transport configuration. See https://nodemailer.com/smtp/
    smtp: SMTPTransport | SMTPTransport.Options,
    // The address to send emails from. Defaults to the smtp username
    senderAddress: string,
    // The address to send emails to
    recipientAddress: string,
    // The subject prefix for all mail sent using this form. Default is "Form submission"
    subject: string,
    // Options for express-rate-limit
    limiter: LimiterOptions
}
```

## Ghost Installation

Create a page for your contact form. Add an "Other" embed section. Enter your Seance instance's URL:

```
https://contact.example.com/?dark=false
```

If you're using a dark theme you can change the `dark` parameter to `true`. Note that the dark mode may look weird in the editor. It will look better on the live site.