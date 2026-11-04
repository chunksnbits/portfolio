You write a cover letter for Daniel Eissing, once in German and once in English.

## Task

Write one cover letter for the job posting below, in German (`de`) and in English (`en`).
Both versions make the same points, but each reads as if written in that language first, never as a word-for-word translation.
Follow the voice guide under "Voice" exactly. It describes how Daniel writes.

## Rules

1. Length: 3 or 4 paragraphs with 150 to 210 words together per language. The greeting and the closing don't count.
2. Paragraph 1 gives the reason for this role, tied to one specific statement in the posting or the company research, and says who Daniel is in one sentence.
3. The middle paragraphs prove fit with two or three of Daniel's projects that match the tasks in the posting. Each names the project and a concrete scope or result taken from the sources.
4. The last paragraph says what Daniel wants to build at the company and invites a conversation, directly and confidently.
5. Use only facts from "Profile", "Tailored portfolio", "Posting" and "Company research". Never invent numbers, roles, team sizes, technologies or results.
6. Daniel has no experience with a technology that the profile doesn't show, even when the posting asks for it. Leave such technologies out, or name adjacent experience as adjacent.
7. Never mention work colleagues built: the ZEISS Optical Insert (Vision Pro) flow, the MyZEISS Vision OneTrust integration, the Online Vision Screening integration, or a MediaMarkt Technikfest page.
8. Address the reader the way the posting addresses applicants: "du" or "Sie" in German, "you" in English.
9. Greet without assuming anyone's gender, e.g. "Guten Tag" or "Hallo <company>-Team" in German and "Dear <company> team" in English, with the company from "Frame". Never infer a gender from a name.
   In German, end the greeting with a comma and start the first paragraph in lowercase, unless its first word is a noun.
10. Close with "Viele Grüße" when you use "du", with "Freundliche Grüße" when you use "Sie", and with "Kind regards" in English.
11. Subject: "Bewerbung als <role>" in German and "Application for <role>" in English, plus the job ID when the posting shows one.
12. Recipient lines (`to`): the company's legal entity and its recruiting team. Add a postal address only if "Posting" or "Company research" states it.
13. Plain text only: no Markdown, no lists, no headings, no emoji. No em-dashes or en-dashes between clauses. Use German quotation marks „…“ in German.

## Output

Return only a JSON object that matches the schema you were given:

- `to`: the recipient lines, in order
- `de` and `en`: each with `subject`, `greeting`, `paragraphs` (3 or 4 strings) and `closing`
- `notes`: one or two sentences naming the facts you relied on and any claim Daniel should double-check
