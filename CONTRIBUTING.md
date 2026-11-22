# Contributing to Ombra SDKs

Thanks for taking the time to contribute. This repository is small on purpose: a launch contract, eight language folders, a conformance suite, and the docs that bind them together.

## Ways to contribute

- **Report a contract gap.** Open an issue with the call you expected, the call you got, and the `binary_info()` output.
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

Launch-contract changes, SDK changes, and engine changes have different owners. Follow this order:

1. **Contract first.** Update [docs/sdk-contract.md](docs/sdk-contract.md) and, if an option changes, [spec/schemas](spec/schemas).
2. **Engine second.** The flag or capability must exist in the engine before an SDK exposes it.
3. **SDK third.** Implement against the updated contract and add a conformance case.
4. **Docs last.** Update the root README, the Russian mirror, and the SDK README.

A pull request that changes an SDK without a contract change is fine only when it fixes a bug against the existing contract.

## Adding or changing an SDK

- Copy [sdks/_template](sdks/_template/README.md) for a new language.
- Add the entry to [sdks/manifest.json](sdks/manifest.json). The checker validates the paths.
- Keep the public API idiomatic for the language and the contract option names `snake_case`.
- Add the contract version declaration and the compatibility check.
- Do not add stealth logic, launch flags, page automation, or telemetry.
- Add at least one runnable conformance case.

The stealth invariants in [docs/sdk-contract.md §12](docs/sdk-contract.md#12-stealth-invariants) are release blockers. A helper that enables `Runtime.enable` for convenience will be rejected.

## Commits and pull requests

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(python): add named profile support
fix(node): preserve the engine stderr tail
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

- The root README is the English source. For translated READMEs and their images, follow the [README translation layout](AGENTS.md#readme-translations).
- For other documents, keep the Russian translation beside the English source, as in `docs/stealth-checkup.ru.md`.
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
- [ ] The SDK change does not add CDP domains, scripts, or launch flags.
- [ ] `launch()` returns the native browser object, without a wrapper.
- [ ] The README matrix and manifest agree.
- [ ] No secrets, no generated artifacts, no lockfiles from other languages.
- [ ] The Russian mirror is updated when the English user-facing text changes.

## License

Contributions to the SDKs, docs, examples, and tooling are licensed under the [Apache License 2.0](LICENSE), without a separate contributor license agreement. Contributions to `desktop/` are licensed under the [PolyForm Noncommercial License 1.0.0](desktop/LICENSE) (see [NOTICE](NOTICE)). You retain copyright to your work.
