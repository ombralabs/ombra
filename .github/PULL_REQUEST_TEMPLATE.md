<!-- Thanks for the pull request. Keep it focused; one logical change per PR. -->

## What changed

<!-- A short description of the change. -->

## Why

<!-- The problem it solves, or the issue it closes. Use "Closes #123" when relevant. -->

## Type

- [ ] Contract or schema change
- [ ] SDK launcher
- [ ] Conformance case
- [ ] Documentation
- [ ] Tooling or CI
- [ ] Repository maintenance

## Contract and compatibility

- Contract version targeted: `0.1.0`
- [ ] The launch contract is unchanged
- [ ] The contract is updated in this PR, and the engine supports the flag or capability
- [ ] The change is backward compatible
- [ ] The change is breaking and [docs/versioning.md](../docs/versioning.md) was updated

## Testing

<!-- Commands run, cases added, or a clear explanation of why testing is not possible yet. -->

```text
python3 tools/check_repo.py
```

## Checklist

- [ ] `python3 tools/check_repo.py` passes
- [ ] New or changed JSON parses and matches its schema
- [ ] New relative links resolve
- [ ] The SDK adds no CDP domains, init scripts, identity overrides, or launch flags
- [ ] The root README matrix and `sdks/manifest.json` agree
- [ ] The Russian mirror is updated when user-facing English text changed
- [ ] No secrets, real IPs, customer data, or generated artifacts
- [ ] The changelog has an entry when the change is notable
