/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	Profile_aggregate_fields:{
		count:{
			columns:"Profile_select_column"
		}
	},
	Profile_bool_exp:{
		_and:"Profile_bool_exp",
		_not:"Profile_bool_exp",
		_or:"Profile_bool_exp",
		created_at:"timestamp_comparison_exp",
		email:"String_comparison_exp",
		first_name:"String_comparison_exp",
		id:"String_comparison_exp",
		last_name:"String_comparison_exp",
		phone:"String_comparison_exp",
		picture_url:"String_comparison_exp",
		updated_at:"timestamp_comparison_exp"
	},
	Profile_constraint: "enum" as const,
	Profile_insert_input:{
		created_at:"timestamp",
		updated_at:"timestamp"
	},
	Profile_on_conflict:{
		constraint:"Profile_constraint",
		update_columns:"Profile_update_column",
		where:"Profile_bool_exp"
	},
	Profile_order_by:{
		created_at:"order_by",
		email:"order_by",
		first_name:"order_by",
		id:"order_by",
		last_name:"order_by",
		phone:"order_by",
		picture_url:"order_by",
		updated_at:"order_by"
	},
	Profile_pk_columns_input:{

	},
	Profile_select_column: "enum" as const,
	Profile_set_input:{
		created_at:"timestamp",
		updated_at:"timestamp"
	},
	Profile_stream_cursor_input:{
		initial_value:"Profile_stream_cursor_value_input",
		ordering:"cursor_ordering"
	},
	Profile_stream_cursor_value_input:{
		created_at:"timestamp",
		updated_at:"timestamp"
	},
	Profile_update_column: "enum" as const,
	Profile_updates:{
		_set:"Profile_set_input",
		where:"Profile_bool_exp"
	},
	String_comparison_exp:{

	},
	cursor_ordering: "enum" as const,
	mutation_root:{
		delete_Profile:{
			where:"Profile_bool_exp"
		},
		delete_Profile_by_pk:{

		},
		insert_Profile:{
			objects:"Profile_insert_input",
			on_conflict:"Profile_on_conflict"
		},
		insert_Profile_one:{
			object:"Profile_insert_input",
			on_conflict:"Profile_on_conflict"
		},
		update_Profile:{
			_set:"Profile_set_input",
			where:"Profile_bool_exp"
		},
		update_Profile_by_pk:{
			_set:"Profile_set_input",
			pk_columns:"Profile_pk_columns_input"
		},
		update_Profile_many:{
			updates:"Profile_updates"
		}
	},
	order_by: "enum" as const,
	query_root:{
		Profile:{
			distinct_on:"Profile_select_column",
			order_by:"Profile_order_by",
			where:"Profile_bool_exp"
		},
		Profile_aggregate:{
			distinct_on:"Profile_select_column",
			order_by:"Profile_order_by",
			where:"Profile_bool_exp"
		},
		Profile_by_pk:{

		}
	},
	subscription_root:{
		Profile:{
			distinct_on:"Profile_select_column",
			order_by:"Profile_order_by",
			where:"Profile_bool_exp"
		},
		Profile_aggregate:{
			distinct_on:"Profile_select_column",
			order_by:"Profile_order_by",
			where:"Profile_bool_exp"
		},
		Profile_by_pk:{

		},
		Profile_stream:{
			cursor:"Profile_stream_cursor_input",
			where:"Profile_bool_exp"
		}
	},
	timestamp: `scalar.timestamp` as const,
	timestamp_comparison_exp:{
		_eq:"timestamp",
		_gt:"timestamp",
		_gte:"timestamp",
		_in:"timestamp",
		_lt:"timestamp",
		_lte:"timestamp",
		_neq:"timestamp",
		_nin:"timestamp"
	}
}

export const ReturnTypes: Record<string,any> = {
	cached:{
		ttl:"Int",
		refresh:"Boolean"
	},
	Profile:{
		created_at:"timestamp",
		email:"String",
		first_name:"String",
		id:"String",
		last_name:"String",
		phone:"String",
		picture_url:"String",
		updated_at:"timestamp"
	},
	Profile_aggregate:{
		aggregate:"Profile_aggregate_fields",
		nodes:"Profile"
	},
	Profile_aggregate_fields:{
		count:"Int",
		max:"Profile_max_fields",
		min:"Profile_min_fields"
	},
	Profile_max_fields:{
		created_at:"timestamp",
		email:"String",
		first_name:"String",
		id:"String",
		last_name:"String",
		phone:"String",
		picture_url:"String",
		updated_at:"timestamp"
	},
	Profile_min_fields:{
		created_at:"timestamp",
		email:"String",
		first_name:"String",
		id:"String",
		last_name:"String",
		phone:"String",
		picture_url:"String",
		updated_at:"timestamp"
	},
	Profile_mutation_response:{
		affected_rows:"Int",
		returning:"Profile"
	},
	mutation_root:{
		delete_Profile:"Profile_mutation_response",
		delete_Profile_by_pk:"Profile",
		insert_Profile:"Profile_mutation_response",
		insert_Profile_one:"Profile",
		update_Profile:"Profile_mutation_response",
		update_Profile_by_pk:"Profile",
		update_Profile_many:"Profile_mutation_response"
	},
	query_root:{
		Profile:"Profile",
		Profile_aggregate:"Profile_aggregate",
		Profile_by_pk:"Profile"
	},
	subscription_root:{
		Profile:"Profile",
		Profile_aggregate:"Profile_aggregate",
		Profile_by_pk:"Profile",
		Profile_stream:"Profile"
	},
	timestamp: `scalar.timestamp` as const
}

export const Ops = {
query: "query_root" as const,
	mutation: "mutation_root" as const,
	subscription: "subscription_root" as const
}