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
description: Senior Software Engineer in Fulda, Germany. Lead developer of web and mobile apps with React, TypeScript, Expo and .NET for ZEISS, ADAC Motorsport and FC Bayern München.
---

<!--
The English page, published at /portfolio/en/. Its German twin is portfolio.de.md.
How to write this file: README.md, "Writing portfolio.md".
-->

## About {#about}

I build large web and mobile apps that ==stay live for years==.

Thirteen years of frontend architecture, design systems and monorepos, first at SinnerSchrader, then as a freelancer and at Satellytes. Since 2023 more and more full-stack: GraphQL and Node.js services, Azure, and since 2025 a React Native app with the .NET platform behind it. I have led frontend teams since 2014 and enjoy mentoring as much as shipping.

- **13 years** in software development
- **4 lead roles** since 2019
- **Web + mobile** React · Expo · .NET
- **Fulda** remote since 2021

### Architecture that lasts
Monorepos, micro-frontends and design systems for products that run for years, from FC Bayern to ZEISS.

### Leading by building
Lead developer who still writes much of the code, with releases, reviews, onboarding and mentoring included.

### Interface to cloud
I started in interface design and computer graphics. Today I also build the APIs, pipelines and cloud setup behind the interface.

## Projects {#projects}

### AURA Smart Analyzer {#aura}
2025 – today · ZEISS Spectroscopy · Lead developer

1. **AURA handheld NIR**: measures the sample
2. **Expo app**: Bluetooth link, predictions on the phone, fully offline
3. **Cloud platform**: calibrations, sign-in and over-the-air updates

Companion app for ZEISS's handheld near-infrared spectrometer, written almost entirely by me. It connects over Bluetooth LE, runs ONNX calibration models on the phone without a network, and updates the device firmware over the air. Around it I built the update service on Azure Functions, a hardware-in-the-loop test bench and a TypeScript SDK with Protocol Buffers, and contributed to the .NET platform. 70 releases since January 2026.

`Expo` `React Native` `TypeScript` `XState` `Skia` `ONNX` `.NET` `GraphQL` `Azure`

### MyZEISS {#myzeiss}
2023 – 2025 · ZEISS Vision Care · ZEISS Meditec · Lead developer

![MyZEISS Vision dashboard on a desktop](site/assets/img/myzeiss-vision-desktop.webp)
![MyZEISS Vision on an iPhone](site/assets/img/myzeiss-vision-phone.webp "phone")

<!-- Daniel: rewrite the next two paragraphs in your own words. They only claim what the commits show. -->
In MyZEISS Vision, people who wear ZEISS lenses register their products, take an online vision screening and read their visual reports. I owned the web app end to end: 16 of its 17 production releases from November 2024, the redesigned product, prescription and warranty pages, and the app shell of the redesign that is live today.

For ZEISS Meditec I moved the Device Training API from Brandmaker to Veeva Vault and built the service that notifies customers about their devices.

`React` `TypeScript` `Vite` `Azure Functions` `TanStack Query` `Turborepo` `GraphQL`

### ADAC Motorsport {#adac}
2021 – 2025 · adac-motorsport.de · Lead developer

![Pages of the German Rally Championship on adac-motorsport.de](site/assets/img/adac-drm.webp)

The home of ADAC's racing series, from the DTM to the German Rally Championship: Gatsby and React on Contentful, with serverless tools on AWS for content migrations. When Gatsby Cloud shut down and Netlify quoted $2,700–5,700 a month, I moved the builds to GitHub Actions with build servers on DigitalOcean that a workflow sets up: $140 a month, 10% faster and 40% cheaper than before, without downtime.

`Gatsby` `React` `TypeScript` `Contentful` `GraphQL` `GitHub Actions` `AWS Lambda`

### FC Bayern München {#fcbayern}
2019 – 2022 · fcbayern.com · Lead developer

![Match centre, statistics and news of fcbayern.com on phones](site/assets/img/fcbayern-mobile.webp "plain")

Relaunch of fcbayern.com on a headless CMS with a Satellytes team of six. I set up the first prototype of the frontend monorepo in July 2019 and built on it for almost three years. The site has about 100,000 statically generated pages with incremental updates, live tickers and real-time results, light and dark themes, WCAG 2.0 and more than 2,000 unit tests. In August 2021 I built most of the online condolence book for Gerd Müller in three days.

`Gatsby` `React` `TypeScript` `GraphQL` `Apollo` `Lerna` `Storybook` `Jest`

### MediaMarktSaturn {#mediamarktsaturn}
2022 – 2023 · webmobile team · Developer

![A MediaMarkt campaign page](site/assets/img/mms-campaign.webp "Campaign pages on the webmobile platform")

The webmobile team builds the services and apps around MediaMarkt's online shop. I connected Jotform forms to campaign and editorial pages, built the forms and submissions service for the "Testpiloten" product-tester programme as a Contentful app and NestJS API, and added a tracking library to the campaign platform.

`Next.js` `React` `NestJS` `Contentful` `Nx` `GraphQL`

## Experience {#experience}

### Senior Software Engineer · Satellytes
2021 – today · Munich, remote from Fulda

Lead developer for ZEISS, ADAC Motorsport and FC Bayern München, developer for MediaMarktSaturn.

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
