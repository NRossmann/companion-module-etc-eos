"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("@companion-module/base");
exports.default = [
    (0, base_1.CreateConvertToBooleanFeedbackUpgradeScript)({
        pending_cue: true,
        active_cue: true,
        connected: true,
    }),
    /*
     * Place your upgrade scripts here
     * Remember that once it has been added it cannot be removed!
     */
    // function (context, props) {
    // 	return {
    // 		updatedConfig: null,
    // 		updatedActions: [],
    // 		updatedFeedbacks: [],
    // 	}
    // },
];
//# sourceMappingURL=upgrades.js.map