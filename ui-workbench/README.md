# ui-workbench — screen design and the states a screen owes

Every UI artifact the loop grades lives here. `effects/` sits alongside the screens on purpose:
prototypes reference it as `./effects/...`, so keeping them in one directory preserves that
relative link with no path rewriting.

| what | where |
|---|---|
| prototype screens | `prototype.html`, `kinetic-demo.html`, `workflow-explainer.html` |
| background/atmosphere effects | `effects/`, indexed by `effects/registry.json` |
| declared states | each artifact names its own set via `<meta name="ui-states" content="...">` |

The gate suite, the house style (`design.md`), the ledgers and `docs/` stay at the repo ROOT because
they are shared with video-production and are referenced by 5-12 checks each. Moving them would break
the suite and buy nothing.

Run against an artifact here:
    npm run design-gate -- ui-workbench/prototype.html --log --note "..." --why "..."
