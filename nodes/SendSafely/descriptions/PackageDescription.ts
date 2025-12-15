import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['package'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new package',
				action: 'Create a package',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a package',
				action: 'Delete a package',
			},
			{
				name: 'Finalize',
				value: 'finalize',
				description: 'Finalize a package for sending',
				action: 'Finalize a package',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get package information',
				action: 'Get a package',
			},
		],
		default: 'create',
	},

	// Create operation fields
	{
		displayName: 'Workspace Package',
		name: 'workspace',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to create a workspace package (persistent collaboration space)',
	},
	{
		displayName: 'Expiration (Days)',
		name: 'expiration',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['create'],
			},
		},
		default: 7,
		typeOptions: {
			minValue: 0,
			maxValue: 365,
		},
		description: 'Number of days until package expires (0-365, 0 means no expiration)',
	},

	// Get operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['get'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package',
	},

	// Finalize operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['finalize'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package',
	},
	{
		displayName: 'Package Code',
		name: 'packageCode',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['finalize'],
			},
		},
		default: '',
		description: 'The package code received when the package was created',
	},
	{
		displayName: 'Key Code',
		name: 'keyCode',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['finalize'],
			},
		},
		default: '',
		description: 'The encryption key code for the package',
	},

	// Delete operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['delete'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package to delete',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const credentials = await this.getCredentials('sendSafelyApi');

	// Import SendSafely SDK
	const SendSafely = require('@sendsafely/sendsafely');
	const sendsafely = new SendSafely(credentials.apiUrl, credentials.apiKey, credentials.apiSecret);

	let responseData;

	try {
		if (operation === 'create') {
			const workspace = this.getNodeParameter('workspace', index) as boolean;
			const expiration = this.getNodeParameter('expiration', index) as number;

			responseData = await new Promise((resolve, reject) => {
				sendsafely.createPackage((err: Error, pkg: any) => {
					if (err) {
						reject(err);
					} else {
						// Set expiration if specified
						if (expiration > 0) {
							sendsafely.updatePackageLife(pkg.packageId, expiration, (expErr: Error, _expResult: unknown) => {
								if (expErr) {
									reject(expErr);
								} else {
									resolve({ ...pkg, life: expiration });
								}
							});
						} else {
							resolve(pkg);
						}
					}
				}, workspace);
			});

		} else if (operation === 'get') {
			const packageId = this.getNodeParameter('packageId', index) as string;

			responseData = await new Promise((resolve, reject) => {
				sendsafely.getPackageInformation(packageId, (err: Error, pkg: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(pkg);
					}
				});
			});

		} else if (operation === 'finalize') {
			const packageId = this.getNodeParameter('packageId', index) as string;
			const packageCode = this.getNodeParameter('packageCode', index) as string;
			const keyCode = this.getNodeParameter('keyCode', index) as string;

			responseData = await new Promise((resolve, reject) => {
				sendsafely.finalizePackage(
					packageId,
					packageCode,
					keyCode,
					(err: Error, result: any) => {
						if (err) {
							reject(err);
						} else {
							resolve(result);
						}
					},
				);
			});

		} else if (operation === 'delete') {
			const packageId = this.getNodeParameter('packageId', index) as string;

			responseData = await new Promise((resolve, reject) => {
				sendsafely.deletePackage(packageId, (err: Error, _result: unknown) => {
					if (err) {
						reject(err);
					} else {
						resolve({ success: true, packageId, message: 'Package deleted successfully' });
					}
				});
			});

		} else {
			throw new Error(`The operation "${operation}" is not supported`);
		}

	} catch (error) {
		if (this.continueOnFail()) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return [{ json: { error: errorMessage }, pairedItem: { item: index } }];
		}
		throw error;
	}

	return [{ json: responseData as IDataObject, pairedItem: { item: index } }];
}
