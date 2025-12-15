import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import SendSafely SDK
// @ts-ignore - SendSafely SDK doesn't have TypeScript definitions
import SendSafely from 'sendsafely';

/**
 * Initialize and return a SendSafely SDK client with credentials
 */
export async function getSendSafelyClient(this: IExecuteFunctions): Promise<any> {
	const credentials = await this.getCredentials('sendSafelyApi');

	if (!credentials) {
		throw new NodeOperationError(
			this.getNode(),
			'No credentials returned from getCredentials',
		);
	}

	const { baseUrl, apiKey, apiSecret } = credentials;

	if (!baseUrl || !apiKey || !apiSecret) {
		throw new NodeOperationError(
			this.getNode(),
			'Missing required credentials: baseUrl, apiKey, or apiSecret',
		);
	}

	try {
		// Initialize SendSafely client
		const client = new SendSafely(baseUrl as string, apiKey as string, apiSecret as string);
		return client;
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to initialize SendSafely client: ${sanitizeError(error)}`,
		);
	}
}

/**
 * Convert callback-based SDK methods to promises
 */
export function wrapSdkCallback<T>(
	fn: (callback: (error: Error | null, result?: T) => void) => void,
): Promise<T> {
	return new Promise((resolve, reject) => {
		fn((error, result) => {
			if (error) {
				reject(error);
			} else if (result !== undefined) {
				resolve(result);
			} else {
				reject(new Error('No result returned from SDK method'));
			}
		});
	});
}

/**
 * Retry function with exponential backoff for rate limiting
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 1000,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: any) {
			lastError = error;

			// Check if it's a rate limit error (429) or server error (5xx)
			const isRateLimitError =
				error.statusCode === 429 ||
				error.message?.toLowerCase().includes('rate limit') ||
				error.message?.toLowerCase().includes('too many requests');

			const isServerError = error.statusCode >= 500 && error.statusCode < 600;

			// Only retry on rate limit or server errors
			if (!isRateLimitError && !isServerError) {
				throw error;
			}

			// Don't retry if we've exhausted attempts
			if (attempt === maxRetries) {
				break;
			}

			// Calculate exponential backoff delay
			const delay = baseDelay * Math.pow(2, attempt);
			const jitter = Math.random() * 200; // Add small random jitter
			const totalDelay = delay + jitter;

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, totalDelay));
		}
	}

	throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sanitize error messages to remove sensitive credentials
 */
export function sanitizeError(error: any): string {
	if (!error) {
		return 'Unknown error occurred';
	}

	let message: string;

	if (error instanceof Error) {
		message = error.message;
	} else if (typeof error === 'string') {
		message = error;
	} else if (error.message) {
		message = error.message;
	} else {
		message = JSON.stringify(error);
	}

	// Remove common credential patterns
	message = message.replace(/apiKey[=:]\s*[^\s,}]+/gi, 'apiKey=***');
	message = message.replace(/apiSecret[=:]\s*[^\s,}]+/gi, 'apiSecret=***');
	message = message.replace(/api[_-]?key[=:]\s*[^\s,}]+/gi, 'api_key=***');
	message = message.replace(/api[_-]?secret[=:]\s*[^\s,}]+/gi, 'api_secret=***');
	message = message.replace(/password[=:]\s*[^\s,}]+/gi, 'password=***');
	message = message.replace(/token[=:]\s*[^\s,}]+/gi, 'token=***');
	message = message.replace(/authorization:\s*[^\s,}]+/gi, 'authorization: ***');
	message = message.replace(/ss-api-key:\s*[^\s,}]+/gi, 'ss-api-key: ***');

	return message;
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
	if (!email || typeof email !== 'string') {
		return false;
	}

	// RFC 5322 simplified email validation
	const emailRegex =
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

	return emailRegex.test(email);
}

/**
 * Sanitize file names to prevent path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
	if (!fileName || typeof fileName !== 'string') {
		throw new Error('Invalid file name');
	}

	// Remove path traversal patterns
	let sanitized = fileName.replace(/\.\./g, '');
	sanitized = sanitized.replace(/[\/\\]/g, '');

	// Remove null bytes
	sanitized = sanitized.replace(/\0/g, '');

	// Trim whitespace
	sanitized = sanitized.trim();

	if (sanitized.length === 0) {
		throw new Error('File name cannot be empty after sanitization');
	}

	return sanitized;
}

/**
 * Validate package ID format (alphanumeric only)
 */
export function validatePackageId(packageId: string): boolean {
	if (!packageId || typeof packageId !== 'string') {
		return false;
	}

	// SendSafely package IDs are typically alphanumeric with hyphens/underscores
	const packageIdRegex = /^[a-zA-Z0-9_-]+$/;

	return packageIdRegex.test(packageId) && packageId.length > 0;
}

/**
 * Parse and validate binary data for file operations
 */
export async function getBinaryDataBuffer(
	this: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string = 'data',
): Promise<Buffer> {
	this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	return binaryDataBuffer;
}

/**
 * Format SendSafely API response for n8n output
 */
export function formatApiResponse(response: any): any {
	// Remove unnecessary metadata and format for n8n
	if (response && typeof response === 'object') {
		// Create a clean copy
		const formatted = { ...response };

		// Remove internal fields if present
		delete formatted.__typename;
		delete formatted._raw;

		return formatted;
	}

	return response;
}

/**
 * Parse package URL from packageId and packageCode
 */
export function getPackageUrl(baseUrl: string, packageId: string, packageCode: string): string {
	// Remove trailing slash from baseUrl
	const cleanBaseUrl = baseUrl.replace(/\/$/, '');

	// SendSafely package URLs follow this pattern
	return `${cleanBaseUrl}/receive/?packageCode=${packageCode}#packageCode=${packageId}`;
}

/**
 * Handle pagination for list operations
 */
export interface PaginationOptions {
	limit?: number;
	offset?: number;
	returnAll?: boolean;
}

export function getPaginationParameters(
	options: PaginationOptions,
): { limit: number; offset: number } {
	const { limit = 50, offset = 0, returnAll = false } = options;

	if (returnAll) {
		return { limit: 1000, offset: 0 }; // Max limit for returnAll
	}

	return {
		limit: Math.min(limit, 1000), // Cap at 1000
		offset: Math.max(offset, 0), // Ensure non-negative
	};
}
