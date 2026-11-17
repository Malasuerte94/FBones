# MCP Reset rejection — independent client/UI gate

The actual final0.10 dedicated native run is a retained negative result. Its
independent SDK client completes the23 routes and authored semantic checks;
the driver proves unchanged displayed/native settings and successful reuse of
the original copied connection across Stop/Start. It then fails in the explicit
stopped-Reset phase with `ConnectionResetError104`. The run's terminal receipt
records native exit−15 and `normalExit=false`; do not label this run complete,
HTTP401-proven or normally closed. Private result/client/terminal evidence stays
under the ignored final0.10 acceptance directory. No protected window was used.

Direct driver audit: `initialize_connection(reset_running,
token=status['token'])` constructs a POST at the **new actual native URL**,
carrying a real JSON initialization body and the **old nonempty token**. Testing
the new listener avoids confusing a closed old port with authentication proof.
The old-token branch accepts only an actual `urllib.error.HTTPError` whose code
is401. A connection reset is neither caught as success nor substituted for401.
Credentials are compared privately and never written into public result fields.

Direct server source observation: early unauthorized rejection writes401 before
reading the known POST body. This is consistent with the unread-body TCP reset
hypothesis, not by itself wire-level proof of its cause. A bounded discard of
validly framed rejected body bytes, without dispatch/deserialization/authoring,
can make the rejection observable. Keep input/deadline/body limits and test the
same real POST. Do not weaken the driver to accept a reset, retry it into a pass,
or treat lack of mutation as proof that a401 response reached the client.

Driver evidence improvement: record the successful new-connection initialization
and the start of the old-token probe as distinct stages before the request. On
failure, cleanup may operate only the exact own PID/start/hash/window and owned
W3C session. Stop through the recognized own MCP control, close its modal and
normally close only a clean native document. Never discard a dirty document,
force an app exit or act after ownership changes. Cleanup remains separate from
test success and must retain the original failure even if normal cleanup works.
