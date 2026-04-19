# Changelog

## 1.0.0 (2026-04-19)


### Features

* add --sol-key import, suppress irrelevant chain addresses ([78260a1](https://github.com/JayAlwaysCodes/sentridrip/commit/78260a1d83955eb1efbc56554db8f9a9bb920635))
* add agent use-token, simplify config to defaultWallet + agentTokens ([e2e18e4](https://github.com/JayAlwaysCodes/sentridrip/commit/e2e18e4173313cde322a61b8fa9ec6215ecf977d))
* add send command, agent token auto-save, bridge polling, and security hardening ([090d302](https://github.com/JayAlwaysCodes/sentridrip/commit/090d302a3f1361c6910ce5ab30da14506216482c))
* add SentriDrip DCA bot - backend, frontend, custom policies ([46ec03f](https://github.com/JayAlwaysCodes/sentridrip/commit/46ec03f97a4011dcba52a42adbe5431f6a374e29))
* add SentriDrip DCA bot - backend, frontend, custom policies ([8619531](https://github.com/JayAlwaysCodes/sentridrip/commit/86195310675170251dccbafb292728590347a79b))
* add Solana support for x402 pay-per-call ([8afbecc](https://github.com/JayAlwaysCodes/sentridrip/commit/8afbecc2c9f31ed2e6b49987a8548128e34936f1))
* add Solana support for x402 pay-per-call payments ([7d2a3b3](https://github.com/JayAlwaysCodes/sentridrip/commit/7d2a3b3d9109a1f51ba898931e7ce0b352318306))
* add x402 pay-per-call support ([3c8ab90](https://github.com/JayAlwaysCodes/sentridrip/commit/3c8ab90a9979d81db517206c6e1d163e59d0c8ef))
* enforce executable policies (deny-transfers) at CLI level ([64936de](https://github.com/JayAlwaysCodes/sentridrip/commit/64936deb0a81e5ec9d32f87119e5c4ab18db58c0))
* implement x402 payment protocol handshake ([20418db](https://github.com/JayAlwaysCodes/sentridrip/commit/20418dbefdb99f62682b6cbc323dbf6ee354a7c5))
* improve help output and zerion-cli skill for agent wallet support ([88c4d5e](https://github.com/JayAlwaysCodes/sentridrip/commit/88c4d5e9425fb1d82f521b505bfecf25efecee9c))
* merge zerion-wallet-cli into unified zerion-cli ([3bacd3a](https://github.com/JayAlwaysCodes/sentridrip/commit/3bacd3a1a8e8cb9048ea866c1ae498b47047d7be))
* remove --yes confirmation flag, execute trades directly ([e042521](https://github.com/JayAlwaysCodes/sentridrip/commit/e04252165dde09567684e7048b10d117b0ef2ac4))
* require security policy for agent tokens, add interactive policy picker ([925d177](https://github.com/JayAlwaysCodes/sentridrip/commit/925d177008e88fe1c6951263a04980cc0666040a))
* show attached policies in wallet list and agent list-tokens ([abefdf6](https://github.com/JayAlwaysCodes/sentridrip/commit/abefdf669b98cdbc863ec951ff78ef2c5164eda2))
* show policy rules summary in wallet list ([df76a2b](https://github.com/JayAlwaysCodes/sentridrip/commit/df76a2b9288a84ee5a1a6aaa6f7e9552432cd5b3))
* support EVM_PRIVATE_KEY + SOLANA_PRIVATE_KEY for dual-chain x402 ([504454f](https://github.com/JayAlwaysCodes/sentridrip/commit/504454fdc5b142c8802f01b95fff9b5e8e98a19e))


### Bug Fixes

* add ENS resolution to wallet analyze command ([c6a82a8](https://github.com/JayAlwaysCodes/sentridrip/commit/c6a82a8f39b47dd76abf86cccb14c0e3b5526461))
* address code review — bugs, reuse, and quality improvements ([f256027](https://github.com/JayAlwaysCodes/sentridrip/commit/f2560279fab73487da740c14ca63e9cd72de764b))
* address code review findings — stale terminology and orphaned files ([75e5552](https://github.com/JayAlwaysCodes/sentridrip/commit/75e555247227405679b0e9f737baac558ed145df))
* address PR review — redact agentToken, structured stderr, consistent HOME ([d81a1f4](https://github.com/JayAlwaysCodes/sentridrip/commit/d81a1f465c4f80a171492b145715fb574c40a1ba))
* address review findings — chain IDs, dead code, security ([45f20df](https://github.com/JayAlwaysCodes/sentridrip/commit/45f20df1eb3da15e7f57690e38c36e9c2a2ee926))
* API contract hardening — timeouts, URL encoding, null safety ([9df9a7b](https://github.com/JayAlwaysCodes/sentridrip/commit/9df9a7bae2a42b51c7017020fb1e7019df020805))
* better swap error messages, add USDC deposit info on wallet page ([3634a37](https://github.com/JayAlwaysCodes/sentridrip/commit/3634a376882cc804eaf4143973788d9c9b12310f))
* clean up three review issues in x402 key handling ([9b87977](https://github.com/JayAlwaysCodes/sentridrip/commit/9b879773d6fa03191d6604c634eb52b7d67862b0))
* correct @x402/fetch and @x402/evm version ranges ([0f3ebd1](https://github.com/JayAlwaysCodes/sentridrip/commit/0f3ebd193e8c135e83bafb5db9bd74fa86533c0d))
* ENS resolution reliability, token active flag, address validation, send usage ([dd227bb](https://github.com/JayAlwaysCodes/sentridrip/commit/dd227bb5ed6b2fdbb2ebdb80ca1d083a6642a890))
* handle missing API key gracefully in CI test ([c98c214](https://github.com/JayAlwaysCodes/sentridrip/commit/c98c2147bff2920b840aab51c38cd86c4bb94ad2))
* harden all pre-existing bare catch patterns across cli ([4629820](https://github.com/JayAlwaysCodes/sentridrip/commit/4629820794cca26276b5690a12e7846c729412e5))
* integration tests use config for API key, fix stale assertions ([7fe3e3b](https://github.com/JayAlwaysCodes/sentridrip/commit/7fe3e3b231c690f2bf0906df75475820d8d39436))
* move EVM key format guard before async imports; merge bash blocks in SKILL.md ([b79d7f7](https://github.com/JayAlwaysCodes/sentridrip/commit/b79d7f79e4f896f522a41e81f742d476ffd5ddf8))
* pass CAIP-2 chain ID to OWS for correct policy enforcement ([0f48250](https://github.com/JayAlwaysCodes/sentridrip/commit/0f482506ec5ba67cfe521d7665bd69850624c0cc))
* path traversal check for macOS (/etc → /private/etc) ([b5cec18](https://github.com/JayAlwaysCodes/sentridrip/commit/b5cec186a4376f931cbcad4fa96f4848793c682b))
* policy enforcement — filter by wallet, fail-closed on missing policy ([6211ef3](https://github.com/JayAlwaysCodes/sentridrip/commit/6211ef35545ab3eb890499146fa4b2e3b70f2515))
* pre-merge review — bugs, security hardening, contract alignment ([c39fb6d](https://github.com/JayAlwaysCodes/sentridrip/commit/c39fb6dcfc59a4c6d9a5bf78fea366a8d16e6099))
* remove broken agent token validation — OWS validates at sign time ([0d6ed88](https://github.com/JayAlwaysCodes/sentridrip/commit/0d6ed88c3b993692b4cf7dce3ba5e9972a4634f4))
* remove duplicate code and fix wallet positions handler ([c3e0f1f](https://github.com/JayAlwaysCodes/sentridrip/commit/c3e0f1faf43f58804ada9e29190f44403e53d723))
* replace all "zerion" command references with "zerion-cli" across codebase ([7f54319](https://github.com/JayAlwaysCodes/sentridrip/commit/7f5431929b907bd2b936237f6d734a71b5400a10))
* reuse matching policies instead of creating duplicates ([24a03aa](https://github.com/JayAlwaysCodes/sentridrip/commit/24a03aa9e1bca73f013425af6e65851a8a1ce221))
* simplify bridge usage message, remove confusing crossSwap example ([1f7c6c4](https://github.com/JayAlwaysCodes/sentridrip/commit/1f7c6c48c28b61454cbe5fd5af1c2907ae116901))
* sync README and skills with recent changes, remove commands.md ([e307036](https://github.com/JayAlwaysCodes/sentridrip/commit/e30703640922d934c3a35018af9d7c241dc157f2))
* tighten x402 key validation and base58 decoding ([24018b1](https://github.com/JayAlwaysCodes/sentridrip/commit/24018b118e3bcc4221591204a47e0e75b80b3610))
* translate OWS "API key not found" to clear agent token error ([2816774](https://github.com/JayAlwaysCodes/sentridrip/commit/281677479941c5f1f80035c1e1aa8bf9bcc6cb50))
* update integration test for local chains command ([69e7ec5](https://github.com/JayAlwaysCodes/sentridrip/commit/69e7ec50c6a5966b890444c5328b6d1ab31fc034))
* upgrade @open-wallet-standard/core to ^1.2.4 ([fe234c7](https://github.com/JayAlwaysCodes/sentridrip/commit/fe234c754f6a9b99ae545dc5ad2d5268078909a3))
* use --chain flag for tx chain ID instead of API response ([286e6d9](https://github.com/JayAlwaysCodes/sentridrip/commit/286e6d9b7d7f8c2d37b69ac217d46168e2cb984a))
* use zerion-cli in search command suggestion text ([1ff2e9d](https://github.com/JayAlwaysCodes/sentridrip/commit/1ff2e9d8c6a1ef87b4bff08b91f7965336bbcd94))

## [0.3.0](https://github.com/zeriontech/zerion-ai/compare/v0.2.0...v0.3.0) (2026-04-03)


### Features

* add Solana support for x402 pay-per-call ([8afbecc](https://github.com/zeriontech/zerion-ai/commit/8afbecc2c9f31ed2e6b49987a8548128e34936f1))
* add Solana support for x402 pay-per-call payments ([7d2a3b3](https://github.com/zeriontech/zerion-ai/commit/7d2a3b3d9109a1f51ba898931e7ce0b352318306))
* support EVM_PRIVATE_KEY + SOLANA_PRIVATE_KEY for dual-chain x402 ([504454f](https://github.com/zeriontech/zerion-ai/commit/504454fdc5b142c8802f01b95fff9b5e8e98a19e))


### Bug Fixes

* clean up three review issues in x402 key handling ([9b87977](https://github.com/zeriontech/zerion-ai/commit/9b879773d6fa03191d6604c634eb52b7d67862b0))
* move EVM key format guard before async imports; merge bash blocks in SKILL.md ([b79d7f7](https://github.com/zeriontech/zerion-ai/commit/b79d7f79e4f896f522a41e81f742d476ffd5ddf8))
* tighten x402 key validation and base58 decoding ([24018b1](https://github.com/zeriontech/zerion-ai/commit/24018b118e3bcc4221591204a47e0e75b80b3610))
