"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const base_1 = require("@companion-module/base");
function default_1(self) {
    self.setFeedbackDefinitions({
        pending_cue: {
            type: 'boolean',
            name: 'When cue is pending',
            description: "Changes the button's style when this cue is pending.",
            defaultStyle: {
                bgcolor: (0, base_1.combineRgb)(204, 102, 0),
                color: (0, base_1.combineRgb)(255, 255, 255),
            },
            options: [
                {
                    id: 'list',
                    type: 'textinput',
                    label: 'Cue List',
                    default: '1',
                    regex: base_1.Regex.NUMBER,
                },
                {
                    id: 'number',
                    type: 'textinput',
                    label: 'Cue Number',
                    default: '1',
                    regex: base_1.Regex.FLOAT_OR_INT,
                },
            ],
            callback: (feedback) => {
                return (feedback.options.list === self.instanceState['cue_pending_list'] &&
                    feedback.options.number === self.instanceState['cue_pending_num']);
            },
        },
        active_cue: {
            type: 'boolean',
            name: 'When cue is active',
            description: "Changes the button's style when this cue is active.",
            defaultStyle: {
                bgcolor: (0, base_1.combineRgb)(51, 102, 0),
                color: (0, base_1.combineRgb)(255, 255, 255),
            },
            options: [
                {
                    id: 'list',
                    type: 'textinput',
                    label: 'Cue List',
                    default: '1',
                    regex: base_1.Regex.NUMBER,
                },
                {
                    id: 'number',
                    type: 'textinput',
                    label: 'Cue Number',
                    default: '1',
                    regex: base_1.Regex.FLOAT_OR_INT,
                },
            ],
            callback: (feedback) => {
                return (feedback.options.list === self.instanceState['cue_active_list'] &&
                    feedback.options.number === self.instanceState['cue_active_num']);
            },
        },
        previous_cue: {
            type: 'boolean',
            name: 'When cue is the previous cue',
            description: "Changes the button's style when this cue is previous.",
            defaultStyle: {
                bgcolor: (0, base_1.combineRgb)(51, 102, 0),
                color: (0, base_1.combineRgb)(255, 255, 255),
            },
            options: [
                {
                    id: 'list',
                    type: 'textinput',
                    label: 'Cue List',
                    default: '1',
                    regex: base_1.Regex.NUMBER,
                },
                {
                    id: 'number',
                    type: 'textinput',
                    label: 'Cue Number',
                    default: '1',
                    regex: base_1.Regex.FLOAT_OR_INT,
                },
            ],
            callback: (feedback) => {
                return (feedback.options.list === self.instanceState['cue_previous_list'] &&
                    feedback.options.number === self.instanceState['cue_previous_num']);
            },
        },
        connected: {
            type: 'boolean',
            name: 'When connection to console changes',
            description: 'Changes colors when the connection state to the console changes.',
            defaultStyle: {
                bgcolor: (0, base_1.combineRgb)(51, 102, 0),
                color: (0, base_1.combineRgb)(255, 255, 255),
            },
            options: [
                {
                    id: 'connected',
                    type: 'checkbox',
                    label: 'Is connected',
                    default: true,
                },
            ],
            callback: (feedback) => {
                return feedback.options.connected === self.instanceState['connected'];
            },
        },
        macro_fired: {
            type: 'boolean',
            name: 'When macro is fired',
            description: "Changes the button's style when this macro is triggered.",
            defaultStyle: {
                bgcolor: (0, base_1.combineRgb)(255, 0, 0),
                color: (0, base_1.combineRgb)(255, 255, 255),
            },
            options: [
                {
                    id: 'macro',
                    type: 'textinput',
                    label: 'Macro Number',
                    default: '1',
                    regex: base_1.Regex.NUMBER,
                },
            ],
            callback: (feedback) => {
                const result = feedback.options.macro === self.instanceState['macro_fired'];
                self.log('debug', `macro_fired feedback check: expected=${feedback.options.macro}, actual=${self.instanceState['macro_fired']}, result=${result}`);
                return result;
            },
        },
    });
}
//# sourceMappingURL=feedbacks.js.map