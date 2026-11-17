// ---------- game state ----------
// (17 nov., user) one colour for « where to go »: checkpoints, mission and delivery targets, the chevrons pointing at them
// (fuchsia: no bonus, police light, team or hill uses it); race starts blue and challenge starts orange, map and street alike
const OBJ_CSS = '#ff4fe0', OBJ_COL = 0xff4fe0, RACE_CSS = '#1f8fd6', RACE_COL = 0x1f8fd6, CHAL_CSS = '#ff9a2a', CHAL_COL = 0xff9a2a;
const SLOT_PAINT = [[0x5b2ba6, 0xf2c14e], [0x1f8a8a, 0xf3ead8], [0xd9622b, 0x161616], [0x3f8f3a, 0xf2e14e]];
const NET_PAINT = [0x5b2ba6, 0x1f8a8a, 0xd9622b, 0x3f8f3a, 0xc23b6e, 0x2f62c8, 0xd8b23a, 0x8a3a2a, 0x6f6f78, 0xe8e2d0, 0x2aa86a, 0x9a4fd0];
let locals = [], player = null, rivals = [], pickups = [];
