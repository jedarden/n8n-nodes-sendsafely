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
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file from a package',
				action: 'Download a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file to a package',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},

	// Upload operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package to upload to',
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
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		description: 'The encryption key code for the package',
	},
	{
		displayName: 'Server Secret',
		name: 'serverSecret',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		description: 'The server secret received when the package was created',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: 'data',
		required: true,
		placeholder: 'data',
		description: 'Name of the binary property containing the file to upload',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: '',
		placeholder: 'document.pdf',
		description: 'Optional custom file name (if not provided, uses the binary data file name)',
	},

	// Download operation fields
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
		default: '',
		placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
		description: 'The unique identifier of the package',
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
		default: '',
		placeholder: 'file-XXXXXXXXXXXX',
		description: 'The unique identifier of the file to download',
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
				resource: ['file'],
				operation: ['download'],
			},
		},
		default: '',
		description: 'The encryption key code for the package',
	},
	{
		displayName: 'Server Secret',
		name: 'serverSecret',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
		default: '',
		description: 'The server secret for the package',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
		default: 'data',
		required: true,
		placeholder: 'data',
		description: 'Name of the binary property to store the downloaded file',
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
		if (operation === 'upload') {
			const packageId = this.getNodeParameter('packageId', index) as string;
			const keyCode = this.getNodeParameter('keyCode', index) as string;
			const serverSecret = this.getNodeParameter('serverSecret', index) as string;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
			const fileName = this.getNodeParameter('fileName', index, '') as string;

			// Get binary data
			const binaryData = this.helpers.assertBinaryData(index, binaryPropertyName);
			const buffer = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);

			// Determine file name
			const uploadFileName = fileName || binaryData.fileName || 'file';

			// Upload file
			responseData = await new Promise((resolve, reject) => {
				sendsafely.encryptAndUploadFile(
					packageId,
					keyCode,
					uploadFileName,
					buffer,
					(uploadErr: Error, fileInfo: any) => {
						if (uploadErr) {
							reject(uploadErr);
						} else {
							resolve(fileInfo);
						}
					},
					serverSecret,
				);
			});

		} else if (operation === 'download') {
			const packageId = this.getNodeParameter('packageId', index) as string;
			const fileId = this.getNodeParameter('fileId', index) as string;
			const keyCode = this.getNodeParameter('keyCode', index) as string;
			const serverSecret = this.getNodeParameter('serverSecret', index) as string;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;

			// Download and decrypt file
			const fileData = await new Promise<{ fileName: string; fileData: Buffer }>((resolve, reject) => {
				sendsafely.downloadAndDecryptFile(
					packageId,
					fileId,
					keyCode,
					(downloadErr: Error, result: any) => {
						if (downloadErr) {
							reject(downloadErr);
						} else {
							resolve(result);
						}
					},
					serverSecret,
				);
			});

			// Prepare binary data
			const binaryDataOutput = await this.helpers.prepareBinaryData(
				fileData.fileData,
				fileData.fileName,
			);

			return [
				{
					json: {
						fileId,
						packageId,
						fileName: fileData.fileName,
					},
					binary: {
						[binaryPropertyName]: binaryDataOutput,
					},
					pairedItem: { item: index },
				},
			];

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
