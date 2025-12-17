import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getSendSafelyClient,
	getLogger,
	sanitizeError,
	wrapSdkCallback,
	withRetry,
	type SendSafelyLogger,
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
		const logger = getLogger(this);

		logger.info('Starting SendSafely node execution', {
			resource,
			operation,
			itemCount: items.length,
		});

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				logger.debug('Processing item', { itemIndex: i, resource, operation });

				// Get SendSafely client
				const client = await getSendSafelyClient.call(this);

				// Route to appropriate resource handler
				if (resource === 'package') {
					responseData = await executePackageOperation.call(this, client, operation, i, logger);
				} else if (resource === 'file') {
					responseData = await executeFileOperation.call(this, client, operation, i, logger);
				} else if (resource === 'recipient') {
					responseData = await executeRecipientOperation.call(this, client, operation, i, logger);
				} else {
					logger.error('Unsupported resource type', { resource });
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported`,
						{ itemIndex: i },
					);
				}

				logger.debug('Item processed successfully', { itemIndex: i });

				// Add response data to return array
				if (Array.isArray(responseData)) {
					returnData.push(...responseData.map((item) => ({ json: item })));
				} else {
					returnData.push({ json: responseData });
				}
			} catch (error: any) {
				logger.error('Operation failed', {
					resource,
					operation,
					itemIndex: i,
					error: sanitizeError(error),
				});

				// Handle errors according to continueOnFail setting
				if (this.continueOnFail()) {
					logger.warn('Continuing despite error (continueOnFail enabled)', { itemIndex: i });
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

		logger.info('SendSafely node execution completed', {
			resource,
			operation,
			processedItems: items.length,
			returnedItems: returnData.length,
		});

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
	logger: SendSafelyLogger,
): Promise<any> {
		if (operation === 'create') {
			// Create a new package
			const vdr = this.getNodeParameter('vdr', itemIndex, false) as boolean;

			logger.info('Creating package', { vdrMode: vdr });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					if (vdr) {
						client.createPackage(null, callback, true); // true = VDR mode
					} else {
						client.createPackage(null, callback);
					}
				});
			}, 3, 1000, logger);

			logger.info('Package created successfully', { packageId: (result as any)?.packageId });
			return result;
		} else if (operation === 'get') {
			// Get package information
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			logger.info('Getting package information', { packageId });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			}, 3, 1000, logger);

			const resultData = result as any;
			logger.debug('Package information retrieved', {
				packageId,
				state: resultData?.state,
				fileCount: resultData?.files?.length ?? 0,
				recipientCount: resultData?.recipients?.length ?? 0,
			});
			return result;
		} else if (operation === 'finalize') {
			// Finalize package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const undisclosedRecipients = this.getNodeParameter(
				'undisclosedRecipients',
				itemIndex,
				false,
			) as boolean;

			logger.info('Finalizing package', { packageId, undisclosedRecipients });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					if (undisclosedRecipients) {
						client.finalizePackage(packageId, null, callback, true);
					} else {
						client.finalizePackage(packageId, null, callback);
					}
				});
			}, 3, 1000, logger);

			logger.info('Package finalized successfully', { packageId });
			return result;
		} else if (operation === 'delete') {
			// Delete package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			logger.info('Deleting package', { packageId });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.deletePackage(packageId, callback);
				});
			}, 3, 1000, logger);

			logger.info('Package deleted successfully', { packageId });
			return result;
		} else if (operation === 'list') {
			// List packages
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;

			logger.info('Listing packages', { returnAll, limit });

			const packages: any[] = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackages(callback);
				});
			}, 3, 1000, logger);

			const result = returnAll ? packages : packages.slice(0, limit);
			logger.info('Packages listed successfully', {
				totalPackages: packages.length,
				returnedPackages: result.length,
			});
			return result;
		} else if (operation === 'update') {
			// Update package settings
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as any;

			logger.info('Updating package', {
				packageId,
				updateLife: !!updateFields.life,
				updateLabel: !!updateFields.label,
			});

			if (updateFields.life) {
				logger.debug('Updating package life', { packageId, life: updateFields.life });
				await withRetry(async () => {
					return await wrapSdkCallback((callback) => {
						client.updatePackageLife(packageId, updateFields.life, callback);
					});
				}, 3, 1000, logger);
			}

			if (updateFields.label) {
				logger.debug('Updating package label', { packageId, label: updateFields.label });
				await withRetry(async () => {
					return await wrapSdkCallback((callback) => {
						client.updatePackageDescriptor(packageId, updateFields.label, callback);
					});
				}, 3, 1000, logger);
			}

			// Get updated package info
			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			}, 3, 1000, logger);

			logger.info('Package updated successfully', { packageId });
			return result;
		} else {
			logger.error('Unsupported package operation', { operation });
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
	logger: SendSafelyLogger,
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
			const resolvedBuffer = await binaryDataBuffer;
			const fileSize = resolvedBuffer.length;

			logger.info('Starting file upload', {
				packageId,
				fileName,
				fileSize,
				mimeType: binaryData.mimeType,
			});

			const startTime = Date.now();
			const result = await withRetry(async () => {
				logger.debug('Encrypting and uploading file', { packageId, fileName });
				return await wrapSdkCallback((callback) => {
					client.uploadFile(packageId, fileName, binaryDataBuffer, callback);
				});
			}, 3, 1000, logger);

			const duration = Date.now() - startTime;
			logger.info('File uploaded successfully', {
				packageId,
				fileName,
				fileId: (result as any)?.fileId,
				durationMs: duration,
			});
			return result;
		} else if (operation === 'download') {
			// Download file from package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const fileId = this.getNodeParameter('fileId', itemIndex) as string;
			const packageCode = this.getNodeParameter('packageCode', itemIndex) as string;

			logger.info('Starting file download', { packageId, fileId });

			const startTime = Date.now();
			const fileData: Buffer = await withRetry(async () => {
				logger.debug('Downloading and decrypting file', { packageId, fileId });
				return await wrapSdkCallback((callback) => {
					client.downloadFile(packageId, fileId, packageCode, callback);
				});
			}, 3, 1000, logger);

			const duration = Date.now() - startTime;
			logger.info('File downloaded successfully', {
				packageId,
				fileId,
				fileSize: fileData?.length ?? 0,
				durationMs: duration,
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

			logger.info('Deleting file', { packageId, fileId });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.deleteFile(packageId, fileId, callback);
				});
			}, 3, 1000, logger);

			logger.info('File deleted successfully', { packageId, fileId });
			return result;
		} else if (operation === 'list') {
			// List files in package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			logger.info('Listing files in package', { packageId });

			const packageInfo: any = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			}, 3, 1000, logger);

			const files = packageInfo.files || [];
			logger.info('Files listed successfully', {
				packageId,
				fileCount: files.length,
			});
			return files;
		} else {
			logger.error('Unsupported file operation', { operation });
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
	logger: SendSafelyLogger,
): Promise<any> {
		if (operation === 'add') {
			// Add recipient to package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const email = this.getNodeParameter('email', itemIndex) as string;

			logger.info('Adding recipient to package', { packageId, email });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.addRecipient(packageId, email, callback);
				});
			}, 3, 1000, logger);

			logger.info('Recipient added successfully', {
				packageId,
				email,
				recipientId: (result as any)?.recipientId,
			});
			return result;
		} else if (operation === 'remove') {
			// Remove recipient from package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;
			const recipientId = this.getNodeParameter('recipientId', itemIndex) as string;

			logger.info('Removing recipient from package', { packageId, recipientId });

			const result = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.removeRecipient(packageId, recipientId, callback);
				});
			}, 3, 1000, logger);

			logger.info('Recipient removed successfully', { packageId, recipientId });
			return result;
		} else if (operation === 'list') {
			// List recipients of package
			const packageId = this.getNodeParameter('packageId', itemIndex) as string;

			logger.info('Listing recipients for package', { packageId });

			const packageInfo: any = await withRetry(async () => {
				return await wrapSdkCallback((callback) => {
					client.getPackageInformation(packageId, callback);
				});
			}, 3, 1000, logger);

			const recipients = packageInfo.recipients || [];
			logger.info('Recipients listed successfully', {
				packageId,
				recipientCount: recipients.length,
			});
			return recipients;
		} else {
			logger.error('Unsupported recipient operation', { operation });
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "recipient"`,
			);
		}
}
