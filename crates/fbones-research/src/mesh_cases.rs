use super::*;
pub(super) fn cases() -> Vec<Case> {
    let base = json!({"skeleton":{"spine":TARGET_VERSION,"images":"./images/"},"bones":[{"name":"root"}],
        "slots":[{"name":"slot","bone":"root","attachment":"checker"}],
        "skins":[{"name":"default","attachments":{"slot":{"checker":{"type":"mesh","width":32,"height":24,"uvs":[0,0,1,0,1,1,0,1],"vertices":[-16,12,16,12,16,-12,-16,-12],"triangles":[0,1,2,2,3,0],"hull":4}}}}],"animations":{"animation":{}}});
    let mut result = vec![];
    let mut add = |id, recipe| {
        result.push(Case {
            id,
            skeleton_name: "skeleton",
            recipe,
        })
    };
    add("M00-quad", base.clone());
    let mut moved = base.clone();
    moved["skins"][0]["attachments"]["slot"]["checker"]["vertices"][2] = json!(20);
    add("M01-deformed", moved);
    let mut center = base.clone();
    let data = &mut center["skins"][0]["attachments"]["slot"]["checker"];
    data["vertices"] = json!([-16, 12, 16, 12, 16, -12, -16, -12, 0, 0]);
    data["uvs"] = json!([0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5]);
    data["triangles"] = json!([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
    add("M02-center", center);
    let mut triangle = base.clone();
    let data = &mut triangle["skins"][0]["attachments"]["slot"]["checker"];
    data["vertices"] = json!([-16, 12, 16, 12, 0, -12]);
    data["uvs"] = json!([0, 0, 1, 0, 0.5, 1]);
    data["triangles"] = json!([0, 1, 2]);
    data["hull"] = json!(3);
    add("M03-triangle", triangle);
    let mut wide = base.clone();
    wide["skins"][0]["attachments"]["slot"]["checker"]["width"] = json!(96);
    add("M04-width", wide);
    let mut weighted = base.clone();
    weighted["bones"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"arm","parent":"root","x":16,"length":32}));
    let positions = [(-16, 12), (16, 12), (16, -12), (-16, -12)];
    let mut vertices = vec![];
    for (x, y) in positions {
        vertices.extend([
            json!(2),
            json!(0),
            json!(x),
            json!(y),
            json!(0.25),
            json!(1),
            json!(x - 16),
            json!(y),
            json!(0.75),
        ]);
    }
    weighted["skins"][0]["attachments"]["slot"]["checker"]["vertices"] = json!(vertices);
    add("M05-weighted", weighted.clone());
    let mut sparse = weighted.clone();
    sparse["skins"][0]["attachments"]["slot"]["checker"]["vertices"] = json!([
        1, 0, -16, 12, 1, 1, 1, 0, 12, 1, 2, 0, 16, -12, 0.5, 1, 0, -12, 0.5, 1, 0, -16, -12, 1
    ]);
    add("M06-sparse", sparse);
    let mut mixed = base.clone();
    mixed["slots"].as_array_mut().unwrap().insert(
        0,
        json!({"name":"underlay","bone":"root","attachment":"underlay"}),
    );
    mixed["skins"][0]["attachments"]["underlay"] =
        json!({"underlay":{"path":"checker","width":32,"height":24}});
    add("M07-mixed", mixed);
    let mut three = weighted;
    three["bones"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"hand","parent":"arm","x":32,"length":16}));
    let mut vertices = vec![];
    for (x, y) in positions {
        vertices.extend([
            json!(3),
            json!(0),
            json!(x),
            json!(y),
            json!(0.2),
            json!(1),
            json!(x - 16),
            json!(y),
            json!(0.3),
            json!(2),
            json!(x - 48),
            json!(y),
            json!(0.5),
        ]);
    }
    three["skins"][0]["attachments"]["slot"]["checker"]["vertices"] = json!(vertices);
    add("M08-three-bones", three);
    let mut one = base.clone();
    let mut vertices = vec![];
    for (x, y) in positions {
        vertices.extend([json!(1), json!(0), json!(x), json!(y), json!(1)]);
    }
    one["skins"][0]["attachments"]["slot"]["checker"]["vertices"] = json!(vertices);
    add("M09-one-bind", one);
    let mut pentagon = base.clone();
    let data = &mut pentagon["skins"][0]["attachments"]["slot"]["checker"];
    data["vertices"] = json!([0, 12, 16, 3, 10, -12, -10, -12, -16, 3]);
    data["uvs"] = json!([0.5, 0, 1, 0.375, 0.8125, 1, 0.1875, 1, 0, 0.375]);
    data["triangles"] = json!([0, 1, 2, 0, 2, 3, 0, 3, 4]);
    data["hull"] = json!(5);
    add("M10-pentagon", pentagon);
    let mut edge = base.clone();
    edge["skins"][0]["attachments"]["slot"]["checker"]["edges"] =
        json!([0, 6, 0, 2, 2, 4, 4, 6, 0, 4]);
    add("M11-internal-edge", edge);
    let mut child = base.clone();
    child["bones"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"arm","parent":"root","x":40,"rotation":25,"length":100}));
    child["slots"][0]["bone"] = json!("arm");
    add("M12-child-slot", child);
    let mut hidden = base;
    hidden["slots"][0]
        .as_object_mut()
        .unwrap()
        .remove("attachment");
    add("M13-hidden", hidden);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn meshes_and_dense_sparse_bindings_roundtrip_with_inventory_separate_from_draw_order() {
        for case in cases() {
            let model = candidate::region_model(&case.recipe, [3; 16]).unwrap();
            let payload = fbones_format::minimal::regions::encode_region_payload(&model).unwrap();
            assert_eq!(
                fbones_format::minimal::regions::decode_regions(&payload).unwrap(),
                model
            );
            assert!(fbones_format::minimal::decode_minimal(&payload).is_err());
            let mut float_recipe = case.recipe.clone();
            for slot in float_recipe["skins"][0]["attachments"]
                .as_object_mut()
                .unwrap()
                .values_mut()
            {
                for attachment in slot.as_object_mut().unwrap().values_mut() {
                    if attachment["type"] == "mesh" {
                        for number in attachment["vertices"].as_array_mut().unwrap() {
                            *number = json!(number.as_f64().unwrap());
                        }
                    }
                }
            }
            assert_eq!(
                candidate::region_model(&float_recipe, [3; 16]).unwrap(),
                model
            );
        }
    }
}
