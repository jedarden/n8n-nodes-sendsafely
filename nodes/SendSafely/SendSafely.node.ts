import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getSendSafelyClient,
	sanitizeError,
	wrapSdkCallback,
	withRetry,
} from './GenericFunctions';

// Import resource operation descriptions
import { description as packageDescription } from './descriptions/PackageDescription';
import { description as fileDescription } from './descriptions/FileDescription';
import { description as recipientDescription } from './descriptions/RecipientDescription';

export class SendSafely implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SendSafely',
		name: 'sendSafely',
		icon: 'file:sendsafely.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with SendSafely API for secure file transfer',
		defaults: {
			name: 'SendSafely',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sendSafelyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Package',
						value: 'package',
						description: 'Manage secure packages',
					},
					{
						name: 'File',
						value: 'file',
						description: 'Manage files in packages',
					},
					{
						name: 'Recipient',
						value: 'recipient',
						description: 'Manage package recipients',
					},
				],
				default: 'package',
			},
			// Package operations
			...packageDescription,
			// File operations
			...fileDescription,
			// Recipient operations
			...recipientDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				// Get SendSafely client
				const client = await getSendSafelyClient.call(this);

				// Route to appropriate resource handler
				if (resource === 'package') {
					responseData = await executePackageOperation.call(this, client, operation, i);
				} else if (resource === 'file') {
					responseData = await executeFileOperation.call(this, client, operation, i);
				} else if (resource === 'recipient') {
					responseData = await executeRecipientOperation.call(this, client, operation, i);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported`,
						{ itemIndex: i },
					);
				}

				// Add response data to return array
				if (Array.isArray(responseData)) {
					returnData.push(...responseData.map((item) => ({ json: item })));
				} else {
					returnData.push({ json: responseData });
				}
			} catch (error: any) {
				// Handle errors according to continueOnFail setting
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: sanitizeError(error),
						},
						pairedItem: { item: i },
					});
					continue;
				}

				throw new NodeOperationError(
					this.getNode(),
					sanitizeError(error),
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}

}

/**
 * Execute package operations
 */
async function executePackageOperation(
	this: IExecuteFunctions,
	client: any,
	operation: string,
	itemIndex: number,
): Promise<any> {
		if (operation === 'create') {
			// Create a new package
			const vdr = this.getNodeParameter('vdr', itemIndex, false) as boolean;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					if (vdr) {
						client.createPackage(null, callback, true); // true = VDR mode
					} else {
						client.createPackage(null, callback);
					}
				});
			});
		} else if (operation === 'get') {
			// Get package information
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			});
		} else if (operation === 'finalize') {
			// Finalize package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const undisclosedRecipients = this.getNodeParameter(
				'undisclosedRecipients',
				itemIndex,
				false,
			) as boolean;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					if (undisclosedRecipients) {
						client.finalizePackage(packageId, null, callback, true);
					} else {
						client.finalizePackage(packageId, null, callback);
					}
				});
			});
		} else if (operation === 'delete') {
			// Delete package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.deletePackage(packageId, callback);
				});
			});
		} else if (operation === 'list') {
			// List packages
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;

			const packages: any[] = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackages(callback);
				});
			});

			if (returnAll) {
				return packages;
			} else {
				return packages.slice(0, limit);
			}
		} else if (operation === 'update') {
			// Update package settings
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as any;

			if (updateFields.life) {
				await withRetry(async () => {
					return await wrapSdkCallback((callback) => {
						client.updatePackageLife(packageId, updateFields.life, callback);
					});
				});
			}

			if (updateFields.label) {
				await withRetry(async () => {
					return await wrapSdkCallback((callback) => {
						client.updatePackageDescriptor(packageId, updateFields.label, callback);
					});
				});
			}

			// Get updated package info
			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			});
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "package"`,
			);
		}
}

/**
 * Execute file operations
 */
async function executeFileOperation(
	this: IExecuteFunctions,
	client: any,
	operation: string,
	itemIndex: number,
): Promise<any> {
		if (operation === 'upload') {
			// Upload file to package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const binaryPropertyName = this.getNodeParameter(
				'binaryPropertyName',
				itemIndex,
				'data',
			) as string;

			const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
			const binaryDataBuffer = this.helpers.getBinaryDataBuffer(
				itemIndex,
				binaryPropertyName,
			);

			const fileName = binaryData.fileName || 'file';

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.uploadFile(packageId, fileName, binaryDataBuffer, callback);
				});
			});
		} else if (operation === 'download') {
			// Download file from package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const fileId = this.getNodeParameter('fileId', itemIndex) as string;
			const packageCode = this.getNodeParameter('packageCode', itemIndex) as string;

			const fileData: Buffer = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.downloadFile(packageId, fileId, packageCode, callback);
				});
			});

			// Return as binary data
			const binaryPropertyName = this.getNodeParameter(
				'binaryPropertyName',
				itemIndex,
				'data',
			) as string;

			return {
				json: {},
				binary: {
					[binaryPropertyName]: await this.helpers.prepareBinaryData(
						fileData,
						fileId,
					),
				},
			};
		} else if (operation === 'delete') {
			// Delete file from package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const fileId = this.getNodeParameter('fileId', itemIndex) as string;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.deleteFile(packageId, fileId, callback);
				});
			});
		} else if (operation === 'list') {
			// List files in package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			const packageInfo: any = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			});

			return packageInfo.files || [];
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "file"`,
			);
		}
}

/**
 * Execute recipient operations
 */
async function executeRecipientOperation(
	this: IExecuteFunctions,
	client: any,
	operation: string,
	itemIndex: number,
): Promise<any> {
		if (operation === 'add') {
			// Add recipient to package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const email = this.getNodeParameter('email', itemIndex) as string;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.addRecipient(packageId, email, callback);
				});
			});
		} else if (operation === 'remove') {
			// Remove recipient from package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const recipientId = this.getNodeParameter('recipientId', itemIndex) as string;

			return await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.removeRecipient(packageId, recipientId, callback);
				});
			});
		} else if (operation === 'list') {
			// List recipients of package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			const packageInfo: any = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			});

			return packageInfo.recipients || [];
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "recipient"`,
			);
		}
}
