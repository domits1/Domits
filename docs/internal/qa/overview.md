# QA Software Testing Types

Visual Roadmap: [https://roadmap.sh/qa](https://roadmap.sh/qa)


⚙️ **1. Functional Testing** - Tests what the system does.

* Unit testing – Tests individual functions/classes.
* Component testing – Tests a single module as a whole.
* Integration testing – Ensures components work together.
* Smoke testing – Basic check that the build is stable.
* Sanity testing – Quick check after minor changes.
* Regression testing – Ensures old features still work.
* System testing – Tests the entire application end-to-end.
* [End-to-end testing](https://github.com/domits1/Domits/issues/2262) – Simulates real user workflows.
* User acceptance testing (UAT) – Users validate readiness.
* Alpha testing – Internal early-stage testing.
* Beta testing – Limited external user testing.
* Black-box testing – Tests without seeing code.
* White-box testing – Tests with code visibility.
* Gray-box testing – Partial internal knowledge.
* Interface testing – Tests communication between systems.
* API testing – Validates endpoints and data contracts.
* Microservices testing – Verifies distributed interactions.
* Contract testing – Ensures services meet agreed APIs.
* Functional suitability testing – Measures feature completeness.
* Exploratory testing – Simultaneous learning + testing.
* Ad-hoc testing – Unstructured, instinct-driven testing.
* Pair testing – Two people test together.
* Requirement-based testing – Tests directly from requirements.
* Boundary value testing – Tests at input limits.
* Equivalence partitioning – Groups inputs to reduce cases.
* Decision table testing – Tests business logic variations.
* State transition testing – Tests state-dependent behavior.
* [Use case / scenario testing](https://github.com/domits1/Domits/issues/2262) – Tests real-world flows.
* Workflow testing – Validates multi-step business processes.

🔐 **[2. Security Testing](https://github.com/domits1/Domits/issues/2305)** - Ensures protection against threats.

* Vulnerability scanning – Automated search for weaknesses.
* Penetration testing – Ethical hacking attempts.
* SAST – Analyzes source code for vulnerabilities.
* DAST – Tests running app for security issues.
* IAST – Hybrid real-time security analysis.
* RASP testing – Validates self-protecting security features.
* API security testing – Checks API exposure weaknesses.
* Authentication testing – Verifies login mechanisms.
* Authorization testing – Validates access control rules.
* RBAC testing – Ensures correct role-based permissions.
* SQL injection testing – Checks for query manipulation.
* XSS testing – Detects script injection issues.
* CSRF testing – Validates request forgery protections.
* Session management testing – Tests cookies/tokens.
* Security misconfiguration testing – Finds unsafe setups.
* Cryptography testing – Validates encryption usage.
* Data leakage testing – Ensures sensitive data protection.
* Security audit – Formal review of security controls.
* Fuzz testing – Sends random inputs to break the system.
* Threat-model-based testing – Tests according to threat risks.

⚡ **3. Performance Testing** - Evaluates speed, stability, scalability.

* Load testing – Typical user load performance.
* Stress testing – Beyond-limit behavior.
* Spike testing – Sudden traffic bursts.
* Soak/endurance testing – Long-term performance.
* Scalability testing – How well the system expands.
* Volume testing – Large data sets.
* Reliability testing – Consistent performance under stress.
* Capacity testing – Maximum supported load.
* Benchmark testing – Compares against standards.
* Performance profiling – Pinpoints slow code areas.
* Client-side performance testing – Frontend speed tests.

🛠️ **4. Non-Functional & Quality Attribute Testing** - Covers how the system behaves.

* Usability testing – Measures ease of use.
* Accessibility testing – Validates support for disabilities.
* Compatibility testing – Works across devices/browsers.
* Cross-browser testing – UI works across browsers.
* Cross-platform testing – Windows/macOS/Linux/etc.
* Portability testing – Easy movement to new environment.
* Localization testing – Translated content checks.
* Internationalization testing – Ensures ready for many locales.
* Globalization testing – Validates worldwide readiness.
* Installability testing – Installation/uninstallation works.
* Maintainability testing – Ease of modification.
* Supportability testing – Diagnostics/logging readiness.
* Reliability testing – Stable operations over time.
* Recoverability testing – Restores after failure.
* Backup/restore testing – Data safety validation.
* Failover testing – Switches to backups correctly.
* Disaster recovery testing – Validates DR procedures.
* Compliance testing – Meets standards/regulations.
* Audit testing – Verifies compliance records.
* Interoperability testing – Works with other systems.
* Configuration testing – Works on different configs.
* Environmental testing – Behavior in varied environments.

🧪 **5. Code-Based / Structural Testing** - Focuses on internal code structure.

* Statement coverage – Ensures each line runs.
* Branch coverage – Tests each decision path.
* Condition coverage – Tests true/false conditions.
* MC/DC – Ensures independent decision logic coverage.
* Path coverage – All possible code paths.
* Loop testing – Verifies loop behavior.
* Memory leak testing – Finds improper memory use.
* Code complexity testing – Measures code maintainability.
* Mutation testing – Ensures tests catch code changes.
* Static analysis / linting – Code checks without running.

🤖 **6. Automation & CI/CD-Related Testing** - Automation-focused methods.

* Automated regression – Automated re-testing.
* CI testing – Tests on every code merge.
* CD pipeline testing – Ensures deployments work.
* Test data generation – Automated data creation.
* GUI automation testing – Automates UI tests.
* API automation testing – Automates backend tests.
* IaC testing – Validates infrastructure code.
* Container testing – Docker/Kubernetes checks.
* Chaos testing – Injects failures intentionally.
* Canary testing – Deploy to small traffic segment.
* Blue/green testing – Two-environment release testing.

📱 **7. Mobile Application Testing** - Specific to mobile platforms.

* Mobile usability testing – Ease of use on small screens.
* Mobile performance testing – Speed under mobile constraints.
* Network switching testing – 3G/4G/5G/Wi-Fi transitions.
* App store compliance testing – Meets store guidelines.
* Device fragmentation testing – Multiple devices/OS versions.
* Sensor testing – GPS, accelerometer, gyroscope, etc.
* Interrupt testing – Calls/notifications/alerts.
* Battery testing – Power usage impact.
* Memory testing – RAM usage stability.

🧩 **8. Specialized Testing** - Niche or domain-specific techniques.

* A/B testing – Compare two versions.
* Multivariate testing – Multiple variations at once.
* Big data testing – Validates massive datasets.
* ETL testing – Checks data pipelines.
* Data warehouse testing – Ensures correct aggregation.
* Blockchain testing – Validates consensus and smart contracts.
* AI/ML testing – Verifies model behavior.
* Model drift testing – Detects accuracy decay.
* Bias/fairness testing – Ensures no discriminatory outcomes.
* Robotics testing – Embedded behavior validation.
* IoT testing – Connected device testing.
* Embedded systems testing – Hardware-software integration.
* Firmware testing – Low-level code checks.
* Game testing – Gameplay and engine tests.
* AR/VR testing – Immersive experience validation.
* Voice assistant testing – Speech accuracy testing.
* Conversational UX testing – Chatbot reliability.
* Streaming/media testing – Video/audio stability.
* Real-time systems testing – Timing-critical behavior.

🧷 **9. Maintenance & Update Testing** - Testing after deployment.

* Hotfix testing – Quick issue verification.
* Patch testing – Small update validation.
* Upgrade/downgrade testing – Version transitions.
* Rollback testing – Safe fallback capability.
* Recertification testing – Re-validating after major changes.
* Production monitoring testing – Live environment tests.
* Synthetic monitoring – Bot-generated traffic.
* APM-based testing – Observability-driven testing.

🗂️ **10. Test Strategy & Process-Oriented Testing**

* Test readiness review – Ensures prepared to test.
* Test plan review – Validates strategy.
* Risk-based testing – Prioritizes by risk.
* Traceability testing – Maps tests to requirements.
* Shift-left testing – Earlier-in-SDLC testing.
* Shift-right testing – Testing in production.
* V-model testing – Parallel dev & testing flows.
* Agile testing – Frequent, iterative testing.
* DevOps testing – Integrated testing automation.
* Model-based testing – Tests generated from models.
* BDD testing – Human-readable scenario tests.
* TDD – Write tests before code.
* ATDD – Requirements → tests → code.
* Heuristic testing – Pattern-based exploration.
* Session-based testing – Time-boxed structured exploration.
* Checklist-based testing – Uses predefined checklists.

💻 **11. Infrastructure & Environment-Specific Testing**

* Network testing – Bandwidth/latency/connectivity.
* Latency testing – Delay measurements.
* Firewall testing – Rule correctness.
* Load balancer testing – Traffic distribution.
* Failover testing – Switching redundancy.
* Cloud infrastructure testing – Cloud-specific behavior.
* Multi-tenant testing – Data isolation in shared systems.
* VM testing – Virtual machine compatibility.
* Orchestration testing – Kubernetes scaling/health.
* Configuration drift testing – Detects environment mismatch.

🧱 **12. GUI & UI Testing**

* Visual regression testing – Detects UI visual changes.
* Layout testing – Ensures proper placement.
* Responsive testing – Adapts to screen sizes.
* Pixel-perfect testing – Matches exact design specs.
* Keyboard navigation testing – Full keyboard usability.
* Form validation testing – Input rules and messages.
* Component interaction testing – UI controls behavior.

---