"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetVariableDefinitions = GetVariableDefinitions;
exports.UpdateVariableDefinitions = UpdateVariableDefinitions;
const constants = __importStar(require("./constants.js"));
const param_map_js_1 = require("./param_map.js");
function GetVariableDefinitions(self) {
    let variableDefinitions = [
        { variableId: 'cue_active_list', name: 'The active cue list number' },
        { variableId: 'cue_active_num', name: 'The active cue number' },
        { variableId: 'cue_active_label', name: 'The active cue label' },
        { variableId: 'cue_active_duration', name: 'The active cue duration in seconds' },
        { variableId: 'cue_active_intensity', name: 'The active cue intensity percent' },
        { variableId: 'cue_pending_list', name: 'The pending cue list number' },
        { variableId: 'cue_pending_num', name: 'The pending cue number' },
        { variableId: 'cue_pending_label', name: 'The pending cue label' },
        { variableId: 'cue_pending_duration', name: 'The pending cue duration in seconds' },
        { variableId: 'cue_previous_list', name: 'The previous cue list number' },
        { variableId: 'cue_previous_num', name: 'The previous cue number' },
        { variableId: 'cue_previous_label', name: 'The previous cue label' },
        { variableId: 'cue_previous_duration', name: 'The previous cue duration in seconds' },
        { variableId: 'cmd', name: 'The current command line output for the user ' },
        { variableId: 'show_name', name: 'The name of the show' },
        { variableId: 'eos_version', name: 'The Eos software version' },
        { variableId: 'fixture_library_version', name: 'The fixture library version' },
        { variableId: 'gel_swatch_type', name: 'The gel swatch type' },
        { variableId: 'hue', name: 'Current hue value' },
        { variableId: 'saturation', name: 'Current saturation value' },
    ];
    /* we can capture these params/attributes from related wheel updates as both string and float */
    /* values. The list of encoders are in param_map.js which is shared by the main logic */
    Object.entries(param_map_js_1.ParamMap).forEach((entry) => {
        const [label, param] = entry;
        variableDefinitions.push({ variableId: `${param}_stringval`, name: `Encoder: ${label} (string)` });
        variableDefinitions.push({ variableId: `${param}_floatval`, name: `Encoder: ${label} (float)` });
    });
    // Encoder Wheels grouped by categories... Up to ${wheelsPerCategory} wheels per category, 7 categories, 0-6
    for (let i = 0; i <= 6; i++) {
        variableDefinitions.push({ variableId: `cat${i}_wheel_count`, name: `Count of encoders in category ${i}` });
        for (let j = 1; j <= self.wheelsPerCategory; j++) {
            variableDefinitions.push({
                variableId: `cat${i}_wheel_${j}_label`,
                name: `Encoders category ${i} Wheel ${j} Label`,
            });
            variableDefinitions.push({
                variableId: `cat${i}_wheel_${j}_stringval`,
                name: `Encoders category ${i} Wheel ${j} String Value`,
            });
            variableDefinitions.push({
                variableId: `cat${i}_wheel_${j}_floatval`,
                name: `Encoders category ${i} Wheel ${j} Float Value`,
            });
            variableDefinitions.push({
                variableId: `cat${i}_wheel_${j}_oscname`,
                name: `Encoders category ${i} Wheel ${j} param name`,
            });
        }
    }
    // There are 6 soft keys, and 6 alternates (exposed with {More SK}).
    for (let i = 1; i <= constants.NUM_SOFTKEYS; i++) {
        variableDefinitions.push({ variableId: `softkey_label_${i}`, name: `Soft key ${i}'s label` });
    }
    // Group Titles '
    for (let i = 1; i <= constants.NUM_GROUP_LABELS; i++) {
        variableDefinitions.push({ variableId: `group_label_${i}`, name: `Group ${i}'s label` });
    }
    // Macro Labels
    for (let i = constants.NUM_MACRO_START; i < constants.NUM_MACRO_START + constants.NUM_MACRO_LABELS; i++) {
        variableDefinitions.push({ variableId: `macro_label_${i}`, name: `Macro ${i}'s label` });
    }
    // '
    return variableDefinitions;
}
function UpdateVariableDefinitions(self) {
    let variableDefinitions = GetVariableDefinitions(self);
    self.setVariableDefinitions(variableDefinitions);
    const variableValues = {};
    // Initialize the default values for the variables
    for (let i = 0; i < variableDefinitions.length; i++) {
        variableValues[variableDefinitions[i].variableId] = '';
    }
    self.setVariableValues(variableValues);
}
//# sourceMappingURL=variables.js.map