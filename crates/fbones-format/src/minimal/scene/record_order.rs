use super::super::Record;

/// Alternate tag ordering observed in three Linux Spine 4.3.26 CLI imports.
pub(in crate::minimal) const STOCK_CLI_PROJECT_ORDER: &[u32] = &[
    17, 20, 0, 13, 45, 42, 28, 35, 41, 15, 36, 32, 29, 43, 19, 40, 30, 34, 7, 33, 14, 44, 4, 2, 16,
    8, 31,
];

pub(in crate::minimal) const STOCK_CLI_REGION_ORDER: &[u32] =
    &[7, 12, 10, 13, 11, 6, 14, 15, 9, 8, 33, 1, 4, 0, 35, 32, 5];
pub(in crate::minimal) const STOCK_CLI_IK_ORDER: &[u32] = &[
    12, 18, 9, 15, 5, 14, 11, 10, 6, 17, 3, 2, 16, 22, 0, 1, 34, 32,
];

pub(super) fn apply_region(record: &mut Record) {
    apply_order(record, STOCK_CLI_REGION_ORDER);
}

pub(super) fn apply_ik(record: &mut Record) {
    apply_order(record, STOCK_CLI_IK_ORDER);
}

pub(super) fn apply(record: &mut Record) {
    let order: &[u32] = match record.class {
        0 => STOCK_CLI_PROJECT_ORDER,
        11 => &[
            51, 52, 10, 45, 26, 0, 27, 29, 46, 41, 8, 49, 30, 6, 3, 34, 37, 50, 31, 16, 40, 33, 36,
            13, 47, 1, 32, 14, 23, 48, 28, 4, 2, 43, 24, 38, 53, 44, 42, 35, 22, 7, 126,
        ],
        12 => &[
            2, 31, 17, 12, 34, 0, 33, 1, 14, 9, 27, 25, 30, 3, 13, 23, 10, 28, 29, 11, 126,
        ],
        13 => &[7, 11, 9, 1, 3, 12, 0, 5, 13, 15, 2, 8, 16, 14, 126],
        18 => &[3, 10, 6, 1, 0, 7, 8, 2, 9, 5],
        19 => &[7, 2, 1, 4],
        46 => &[
            16, 13, 26, 12, 36, 34, 17, 27, 14, 20, 19, 37, 31, 30, 28, 7, 21, 8, 33, 1, 4, 0, 35,
            32, 5,
        ],
        71 => &[1, 2, 0],
        108 => &[1, 3, 6, 5, 0, 2],
        123 => &[3, 4, 1, 2],
        _ => return,
    };
    apply_order(record, order);
}

fn apply_order(record: &mut Record, order: &[u32]) {
    if record.fields.len() == order.len()
        && record.fields.iter().all(|(tag, _)| order.contains(tag))
    {
        record
            .fields
            .sort_by_key(|(tag, _)| order.iter().position(|candidate| candidate == tag));
    }
}
