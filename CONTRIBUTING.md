# Contributing to Ombra SDKs

Thanks for taking the time to contribute. This repository is small on purpose: a wire contract, eight language folders, a conformance suite, and the docs that bind them together.

## Ways to contribute

- **Report a contract gap.** Open an issue with the call you expected, the call you got, and the app version.
- **Add or improve an SDK.** Start with [sdks/_template](sdks/_template/README.md).
- **Add a conformance case.** A case is worth more than a screenshot.
- **Improve the checkup.** New detectors, better gates, and reproducible failures are welcome.
- **Fix docs.** Typos, broken links, and unclear examples are real contributions.

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first. Security issues go through [SECURITY.md](SECURITY.md), not the public issue tracker.

## Development setup

The repository checker needs Python 3.9+ and no third-party packages:

```bash
python3 tools/check_repo.py
```

Per-SDK toolchains are documented in each SDK README. They are not installed by the repository.

## The change order

Wire changes, SDK changes, and engine changes have different owners. Follow this order:

1. **Contract first.** Update [docs/sdk-contract.md](docs/sdk-contract.md) and, if the payload changes, [spec/schemas](spec/schemas).
2. **App second.** The wire behavior must exist in the app before an SDK relies on it.
3. **SDK third.** Implement against the updated contract and add a conformance case.
4. **Docs last.** Update the root README, the Russian mirror, and the SDK README.

A pull request that changes an SDK without a contract change is fine only when it fixes a bug against the existing contract.

## Adding or changing an SDK

- Copy [sdks/_template](sdks/_template/README.md) for a new language.
- Add the entry to [sdks/manifest.json](sdks/manifest.json). The checker validates the paths.
- Keep the public API idiomatic for the language and the wire format `snake_case`.
- Add the contract version declaration and the compatibility check.
- Do not add stealth logic, launch flags, page automation, or telemetry.
- Add at least one runnable conformance case.

The stealth invariants in [docs/sdk-contract.md §11](docs/sdk-contract.md#11-stealth-invariants) are release blockers. A helper that enables `Runtime.enable` for convenience will be rejected.

## Commits and pull requests

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(python): add profile update
fix(node): preserve raw error message
docs(stealth): clarify proxy flag scoring
chore(repo): validate JSON files in CI
```

A pull request should contain one logical change. Include:

- what changed and why;
- the contract version it targets;
- how it was tested;
- any known gap with an owner and a date.

Use the pull request template. Keep the diff focused; do not reformat unrelated files.

## Documentation style

- English is canonical; Russian translations live next to the English file (`README.ru.md`, `docs/stealth-checkup.ru.md`).
- Write for an engineer who has not read the rest of the repository.
- Prefer concrete commands, field names, and expected values over adjectives.
- Do not promise undetectability, CAPTCHA success rates, or "no blocks".
- Do not include real IPs, proxy credentials, profile data, customer names, or screenshots with personal information.
- Keep relative links. They must work in a fork and offline.

## Review checklist

- [ ] The change follows the contract or updates it first.
- [ ] `python3 tools/check_repo.py` passes.
- [ ] New JSON files parse and match their schema.
- [ ] New links resolve.
- [ ] The SDK change does not add CDP domains, scripts, or flags.
- [ ] The README matrix and manifest agree.
- [ ] No secrets, no generated artifacts, no lockfiles from other languages.
- [ ] The Russian mirror is updated when the English user-facing text changes.

## License

By contributing, you agree that your contribution is licensed under the [Apache License 2.0](LICENSE), without a separate contributor license agreement. You retain copyright to your work.
