/**
 * Module configuration interface
 */
export interface ModuleConfig {
	host?: string
	user_id?: string
	eos_port?: number
	eos_port_slip?: number
	num_group_labels?: number
	num_macro_labels?: number
	num_macro_start?: number
	wheels_per_cat?: number
	num_softkeys?: number
}
