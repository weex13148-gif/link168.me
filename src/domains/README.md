# Domains

`src/domains` contains business rules and domain services.

Allowed dependencies:

- local modules inside the same domain;
- stable contracts from `@/shared/*`;
- other domain contracts only when the dependency is explicit and does not create a cycle.

Forbidden dependencies:

- `@/app/*`;
- `@/components/*`;
- `@/infrastructure/*`.

Domain code must not own HTTP serialization, React rendering, database clients, provider SDKs or deployment configuration.
