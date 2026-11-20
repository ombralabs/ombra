# Repository rules

## README translations

Keep the canonical English README at the repository root. Put each translation
in `translations/<locale>/README.md`, using the language tag as the directory
name (for example, `ru`, `zh-Hans`, or `zh-Hant`). When adding or moving a
translation, update the relative links in every README's language menu.

Store charts, diagrams, and screenshots with language-specific text in
`translations/<locale>/assets/`. For example, a Russian chart goes in
`translations/ru/assets/` and is linked from the Russian README as
`assets/chart.svg`. For English graphics with text, use `translations/en/assets/`.
Keep language-neutral graphics such as the logo in the shared root `assets/`.
