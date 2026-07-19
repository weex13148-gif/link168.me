# Infrastructure

`src/infrastructure` implements adapters for databases, Redis, mail, AI providers, storage, payments and audit persistence.

Infrastructure may depend on domain and shared contracts, but it must not define business policy. Provider-specific details stay behind interfaces consumed by domain services.
