//! Read-only local own-fixture roundtrip; emits aggregate counts, never paths/content.
#[cfg(feature = "scene-codec")]
fn main() {
    use fbones_format::{
        minimal::scene::{decode_scene, encode_scene_payload},
        ProjectEnvelope,
    };
    let paths: Vec<_> = std::env::args_os().skip(1).collect();
    assert!(!paths.is_empty(), "Supply own fixture files");
    for path in paths {
        let envelope =
            ProjectEnvelope::inspect(std::fs::read(path).expect("Own input unavailable"))
                .expect("Envelope rejected");
        let payload = envelope.decoded_payload().expect("Payload rejected");
        let model = decode_scene(&payload).expect("Scene outside complete supported profile");
        assert_eq!(
            encode_scene_payload(&model).expect("Encoding rejected"),
            payload
        );
        println!("{{\"decodedBytes\":{},\"animations\":{},\"events\":{},\"constraintTracks\":{},\"eventTracks\":{},\"wholePayloadEqual\":true}}",payload.len(),model.animations.len(),model.events.len(),model.animations.iter().map(|a|a.constraint_tracks.len()).sum::<usize>(),model.animations.iter().map(|a|a.event_tracks.len()).sum::<usize>());
    }
}
#[cfg(not(feature = "scene-codec"))]
fn main() {
    eprintln!("Enable scene-codec for typed own-fixture verification.");
    std::process::exit(2)
}
