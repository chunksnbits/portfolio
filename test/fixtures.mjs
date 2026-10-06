// Builds a small but complete portfolio.md for the model, parity and render tests.
export function portfolioSource({ lang = 'en', email = 'me@example.com', body = DEFAULT_BODY } = {}) {
  return [
    '---',
    `lang: ${lang}`,
    'name: Daniel Eissing',
    'title: Senior Software Engineer',
    'subtitle: Web and mobile apps',
    'status: Open to senior roles',
    'intro: Builds apps.',
    'location: Fulda, Germany',
    `email: ${email}`,
    'github: https://github.com/chunksnbits',
    'linkedin: https://www.linkedin.com/in/someone',
    'description: Portfolio of Daniel Eissing',
    '---',
    '',
    body,
  ].join('\n');
}

export const DEFAULT_BODY = `## About {#about}

I build ==apps==.

- **13 years** experience

### Architecture
Monorepos and design systems.

## Projects {#projects}

### AURA {#aura}
2025 – today · ZEISS Spectroscopy · Lead developer

1. **Device**: measures
2. **App**: predicts

Companion app.

\`Expo\` \`.NET\`

### MyZEISS {#myzeiss}
2023 – 2025 · ZEISS

![Dashboard](site/assets/img/desktop.webp)
![On a phone](site/assets/img/phone.webp "phone")

Customer portal, see [paper](site/docs/paper.pdf).

\`React\`

## Contact {#contact}

Let's talk.
`;

export const MANIFEST = {
  'assets/img/desktop.webp': { width: 1400, height: 3000, density: 2, avif: 'assets/img/desktop.avif' },
  'assets/img/phone.webp': { width: 400, height: 960, density: 2, avif: 'assets/img/phone.avif' },
};
