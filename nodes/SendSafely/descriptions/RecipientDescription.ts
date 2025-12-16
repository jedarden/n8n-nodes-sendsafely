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
				resource: ['recipient'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a recipient to a package',
				action: 'Add a recipient',
			},
			{
				name: 'Add Multiple',
				value: 'addMultiple',
				description: 'Add multiple recipients to a package',
				action: 'Add multiple recipients',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a recipient from a package',
				action: 'Remove a recipient',
			},
		],
		default: 'add',
	},

	// Add operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['add'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package',
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
				resource: ['recipient'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The encryption key code for the package',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['add'],
			},
		},
		default: '',
		placeholder: 'recipient@example.com',
		description: 'Email address of the recipient',
	},

	// Add Multiple operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['addMultiple'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package',
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
				resource: ['recipient'],
				operation: ['addMultiple'],
			},
		},
		default: '',
		description: 'The encryption key code for the package',
	},
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['addMultiple'],
			},
		},
		default: '',
		placeholder: 'user1@example.com, user2@example.com',
		description: 'Comma-separated list of email addresses',
		typeOptions: {
			rows: 4,
		},
	},

	// Remove operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['remove'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package',
	},
	{
		displayName: 'Recipient ID',
		name: 'recipientId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['remove'],
			},
		},
		default: '',
		placeholder: 'recipient-XXXXXXXXXXXX',
		description: 'The unique identifier of the recipient to remove',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const credentials = await this.getCredentials('sendSafelyApi');

	// Import SendSafely SDK
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const SendSafely = require('@sendsafely/sendsafely');
	const sendsafely = new SendSafely(credentials.baseUrl, credentials.apiKey, credentials.apiSecret);

	let responseData;

	try {
		if (operation === 'add') {
			const packageId = this.getNodeParameter('packageId', index) as string;
			const keyCode = this.getNodeParameter('keyCode', index) as string;
			const email = this.getNodeParameter('email', index) as string;

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				throw new Error(`Invalid email address: ${email}`);
			}

			responseData = await new Promise((resolve, reject) => {
				sendsafely.addRecipient(
					packageId,
					email,
					keyCode,
					(err: Error, recipient: any) => {
						if (err) {
							reject(err);
						} else {
							resolve(recipient);
						}
					},
				);
			});

		} else if (operation === 'addMultiple') {
			const packageId = this.getNodeParameter('packageId', index) as string;
			const keyCode = this.getNodeParameter('keyCode', index) as string;
			const emailsInput = this.getNodeParameter('emails', index) as string;

			// Parse emails (comma-separated or newline-separated)
			const emails = emailsInput
				.split(/[,\n]/)
				.map((e) => e.trim())
				.filter((e) => e.length > 0);

			// Validate email formats
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			const invalidEmails = emails.filter((email) => !emailRegex.test(email));
			if (invalidEmails.length > 0) {
				throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
			}

			// Add recipients sequentially (SendSafely SDK requires this)
			const recipients = [];
			for (const email of emails) {
				const recipient = await new Promise((resolve, reject) => {
					sendsafely.addRecipient(
						packageId,
						email,
						keyCode,
						(err: Error, rec: any) => {
							if (err) {
								reject(err);
							} else {
								resolve(rec);
							}
						},
					);
				});
				recipients.push(recipient);
			}

			responseData = {
				packageId,
				recipients,
				count: recipients.length,
			};

		} else if (operation === 'remove') {
			const packageId = this.getNodeParameter('packageId', index) as string;
			const recipientId = this.getNodeParameter('recipientId', index) as string;

			responseData = await new Promise((resolve, reject) => {
				sendsafely.removeRecipient(
					packageId,
					recipientId,
					(err: Error, _result: unknown) => {
						if (err) {
							reject(err);
						} else {
							resolve({
								success: true,
								packageId,
								recipientId,
								message: 'Recipient removed successfully',
							});
						}
					},
				);
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
