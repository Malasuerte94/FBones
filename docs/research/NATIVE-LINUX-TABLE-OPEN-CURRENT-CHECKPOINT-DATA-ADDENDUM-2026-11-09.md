# Table Open: bind size and hash to the current fresh run

This clarifies the [v6 DATA gate](NATIVE-LINUX-DEBIAN-TABLE-OPEN-V6-DATA-GATE-2026-11-09.md)
before implementation freeze. The405B value describes actualv5 only. A fresh full
integration regenerates project identity/compressed data, so its length may differ.

Require the table Size to equal the CURRENT run's exact saved checkpoint stat
size, and require its hash to equal that same run's clean post-rename checkpoint
hash. Revalidate both immediately before row selection/Open and after reopening.
Never hardcode405, use a previous run's hash or import an old artifact/template.
Name/Location/HOME resolution, exact current own saved path, raw semantic
checkpoint, same SDK row association, one selection and one enabled Open, kernel/
modal ownership and full lifecycle requirements stay strict and unchanged.
This is a fresh fullv6 integration; no base64 input, extra toy or artifact download.
