---
lang: en
name: Daniel Eissing
title: Senior Software Engineer
subtitle: Web and mobile apps, from interface to cloud
status: Open to senior roles
intro: 13 years of large React and Angular apps for ZEISS, FC Bayern, BMW and Allianz, and lately the Expo apps and .NET services behind them.
location: Fulda, Germany · remote
email: github.daniel.eissing@gmail.com
github: https://github.com/chunksnbits
linkedin: https://www.linkedin.com/in/daniel-eißing-5a24805b
description: Senior Software Engineer in Fulda, Germany. Lead engineer of web and mobile apps with React, TypeScript, Expo and .NET for ZEISS, ADAC Motorsport and FC Bayern München.
---

<!--
The English page, published at /portfolio/en/. Its German twin is portfolio.de.md.
How to write this file: README.md, "Writing portfolio.md".
-->

<!-- 10x Engineer -->

## About {#about}

I engineer web and mobile systems that ==are built to last==.

Fifteen years of experience developing and maintaining enterprise grade applications have me ideally prepared for the next phase of AI driven development.
When agents write the code other skills come into focus. Obsession for detail, demonstrated experience in shaping, judging and steering architectural decisions the ability to look beyond the tellerrand enable me to find creative solutions to complicated problems that will drive your business forward.

- **15 years** in software development
- **Leading teams** since 2019
- **Web + mobile** React · Expo · Angular
- **E2E** Frontend · Backend · CI/CD · Cloud

### Architecture that lasts
Monorepos, micro-frontends and design systems for products that run for years, from FC Bayern to ZEISS.

### Leading by building
Lead engineer who still writes much of the code, with releases, reviews, onboarding and mentoring included.

### Interface to cloud
I started in interface design and computer graphics. Today I also build the APIs, pipelines and cloud setup behind the interface.

## Brands {#brands}

Products for brands ==you know==.

My professional career was largely spent working for some of the largest enterprises and brands in Germany. Working for large agencies I worked at and integrated into large corporate structure. This prepared me well to work in and set up processes at enterprise level. Driving architectures that bring design systems to live. Running release processes in full alignment with many stakeholders around the product.

![Allianz](site/assets/logos/allianz.svg "logo")
![BMW](site/assets/logos/bmw.svg "logo")
![Audi](site/assets/logos/audi.svg "logo")
![ZEISS](site/assets/logos/zeiss.svg "logo")
![MediaMarktSaturn](site/assets/logos/mediamarktsaturn.svg "logo")
![E-Plus, now part of Telefónica](site/assets/logos/telefonica.svg "logo")
![FC Bayern München](site/assets/logos/fcbayern.svg "logo")
![ADAC Motorsport](site/assets/logos/adac.svg "logo")
![SinnerSchrader, part of Accenture Interactive](site/assets/logos/sinnerschrader.svg "logo")

## Projects {#projects}

### ZEISS AURA® Smart Analyzer {#aura}
2025 – today · ZEISS Spectroscopy · Lead engineer

![](site/assets/img/zeiss-keyvisual.webp "keyvisual")

1. **AURA NIR**: measures the sample
2. **Expo app**: Bluetooth link, predictions on device, UI. Works on- and offline
3. **Cloud platform**: calibrations, authentication, firmware and app over-the-air updates

ZEISS Aura® is the companion app for a new ZEISS near-infrared spectrometer that gives customers insights into their crops and feeds.

The app connects to the hardware via Bluetooth LE, runs native calibration models on device and works with- or without a network connection.

2nd mode, utilizes the camera module, on-device sensors and image recognition to guide the user through a new kind of sample measurement process.

This project allowed me to shape all aspects of the product. Taking over responsibility and product ownership, developing and advancing the UX and UI direction, managing requirements and tasks.
On the technical front, the task required besides the implementation of bussiness requirements: integrating the app into an existing cloud infrastructure,  contributing to the .NET platform that supports the app and setting up the app store submission and release processes.s and image recognition to guide the user through the sample measurement process.

`Expo` `React Native` `TypeScript` `XState` `Skia` `ONNX` `.NET` `GraphQL` `Azure`

### MyZEISS {#myzeiss}
2023 – 2025 · ZEISS Vision Care · ZEISS Meditec · Lead engineer

![](site/assets/img/zeiss-keyvisual.webp "keyvisual")

![MyZEISS Vision dashboard on a desktop](site/assets/img/myzeiss-vision-desktop.webp)
![MyZEISS Vision on an iPhone](site/assets/img/myzeiss-vision-phone.webp "phone")

<!-- Daniel: rewrite the next two paragraphs in your own words. They only claim what the commits show. -->
In MyZEISS Vision, people who wear ZEISS lenses register their products, take an online vision screening and read their visual reports. I owned the web app end to end: 16 of its 17 production releases from November 2024, the redesigned product, prescription and warranty pages, and the app shell of the redesign that is live today.

For ZEISS Meditec I moved the Device Training API from Brandmaker to Veeva Vault and built the service that notifies customers about their devices.

`React` `TypeScript` `Vite` `Azure Functions` `TanStack Query` `Turborepo` `GraphQL`

### ADAC Motorsport {#adac}
2021 – 2025 · adac-motorsport.de · Lead engineer

![](site/assets/img/adac-keyvisual.webp "keyvisual")

![Pages of the German Rally Championship on adac-motorsport.de](site/assets/img/adac-drm.webp)

The home of ADAC's racing series, from the DTM to the German Rally Championship: Gatsby and React on Contentful, with serverless tools on AWS for content migrations. When Gatsby Cloud shut down and Netlify quoted $2,700–5,700 a month, I moved the builds to GitHub Actions with build servers on DigitalOcean that a workflow sets up: $140 a month, 10% faster and 40% cheaper than before, without downtime.

`Gatsby` `React` `TypeScript` `Contentful` `GraphQL` `GitHub Actions` `AWS Lambda`

### FC Bayern München {#fcbayern}
2019 – 2022 · fcbayern.com · Lead engineer

![](site/assets/img/fcbayern-keyvisual.webp "keyvisual")

![Match centre, statistics and news of fcbayern.com on phones](site/assets/img/fcbayern-mobile.webp "plain")

Relaunch of fcbayern.com on a headless CMS with a Satellytes team of six. I set up the first prototype of the frontend monorepo in July 2019 and built on it for almost three years. The site has about 100,000 statically generated pages with incremental updates, live tickers and real-time results, light and dark themes, WCAG 2.0 and more than 2,000 unit tests. In August 2021 I built most of the online condolence book for Gerd Müller in three days.

`Gatsby` `React` `TypeScript` `GraphQL` `Apollo` `Lerna` `Storybook` `Jest`

### MediaMarktSaturn {#mediamarktsaturn}
2022 – 2023 · webmobile team · Developer

![](site/assets/img/mms-keyvisual.webp "keyvisual")

![A MediaMarkt campaign page](site/assets/img/mms-campaign.webp "Campaign pages on the webmobile platform")

The webmobile team builds the services and apps around MediaMarkt's online shop. I connected Jotform forms to campaign and editorial pages, built the forms and submissions service for the "Testpiloten" product-tester programme as a Contentful app and NestJS API, and added a tracking library to the campaign platform.

`Next.js` `React` `NestJS` `Contentful` `Nx` `GraphQL`

## Experience {#experience}

### Senior Software Engineer · Satellytes
2021 – today · Munich, remote from Fulda

Lead engineer for ZEISS, ADAC Motorsport and FC Bayern München, developer for MediaMarktSaturn.

### Freelance Senior Web Developer
2018 – 2021 · Munich

For Satellytes from 2019, and for jambit as external Senior Software Architect at a southern German car maker: Angular framework and libraries, Spring WebFlux backends, CI/CD with Jenkins and Cloud Foundry.

### (Senior) Product Engineer · SinnerSchrader
2013 – 2018 · Munich, now Accenture Song

Frontend lead for BMW eRetail and Allianz MyInvest, a living styleguide for Audi and a pattern library for Allianz. Senior from 2016.

### Software Engineer · TomTec Imaging Systems
2013 · Unterschleißheim

Reporting features in Java and JavaScript, a Selenium test framework in Ruby, tests for a C++ conversion tool.

### Diplom-Informatiker · University of Koblenz-Landau
2005 – 2013 · Computervisualistik

Computer graphics, interface design and semantic web research. Young Talent Award 2011.

- [strukt: A Pattern System for Integrating Individual and Organizational Knowledge Work](site/docs/paper__scherp_eissing_staab--strukt-a_pattern_system.pdf) · ISWC 2011
- [Analysis and Comparison of Models for Individual and Organisational Knowledge Work](site/docs/paper__scherp_eissing_staab--analysis_and_comparison.pdf) · MKWI 2012
- [A Method for Integrating Multimedia Metadata Standards and Metadata Formats with the Multimedia Metadata Ontology](site/docs/paper__scherp_eissing_saathoff--a_method_for_integrating_multimedia_metadata.pdf) · IJSC 2012

## Skills {#skills}

### Frontend
`TypeScript` `React` `Next.js` `Gatsby` `Angular` `TanStack Query` `XState` `Storybook` `Playwright` `d3.js`

### Mobile
`Expo` `React Native` `Expo Router` `Skia` `Bluetooth LE` `SQLite` `Over-the-air updates`

### Backend and cloud
`Node.js` `GraphQL` `Apollo` `NestJS` `.NET` `HotChocolate` `PostgreSQL` `Azure` `AWS Lambda` `Docker`

### Architecture and delivery
`Monorepos` `Module Federation` `Design systems` `GitHub Actions` `Azure Pipelines` `Terraform` `Vitest` `Jest`

### Ways of working
`Tech lead` `Mentoring` `Code reviews` `Scrum` `Remote teams` `AI coding agents`

## Contact {#contact}

Looking for a senior engineer who leads and still builds? ==Let's talk.==

I'm open to senior and lead roles in web, mobile and full-stack development.

### Privacy
This page sets no cookies and tracks no one. Its fonts are served from this site. GitHub Pages hosts it and may log IP addresses, see [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

### Logos
The logos are trademarks of their owners. They name companies I worked for, directly or through an agency, and imply no endorsement.
