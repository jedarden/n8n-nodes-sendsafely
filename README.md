# n8n-nodes-sendsafely

This is an n8n community node that integrates with the [SendSafely](https://www.sendsafely.com) secure file transfer and encryption platform. It allows you to automate secure file sharing workflows within your n8n automation workflows.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-sendsafely.svg)](https://www.npmjs.com/package/n8n-nodes-sendsafely)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/jedarden/n8n-nodes-sendsafely/workflows/CI/badge.svg)](https://github.com/jedarden/n8n-nodes-sendsafely/actions)

## Features

- Create and manage secure packages for file sharing
- Upload files with end-to-end encryption
- Download files securely
- Add and remove package recipients
- Full TypeScript support
- Comprehensive error handling

## Installation

### Community Nodes (Recommended)

1. In your n8n instance, go to **Settings** > **Community Nodes**
2. Click **Install a Community Node**
3. Enter `n8n-nodes-sendsafely` in the npm Package Name field
4. Click **Install**
5. Restart your n8n instance if required

### Manual Installation

If you're self-hosting n8n, you can install this node manually:

```bash
npm install n8n-nodes-sendsafely
```

For Docker users, add to your Dockerfile:

```dockerfile
RUN cd /usr/local/lib/node_modules/n8n && \
    npm install n8n-nodes-sendsafely
```

Or use the `N8N_CUSTOM_EXTENSIONS` environment variable:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_CUSTOM_EXTENSIONS="/path/to/n8n-nodes-sendsafely" \
  n8nio/n8n
```

## Prerequisites

- n8n version 2.0 or above
- Node.js version 18 or above
- A SendSafely account with API access

## Credentials Setup

### Obtaining SendSafely API Credentials

1. Log in to your SendSafely account at [https://app.sendsafely.com](https://app.sendsafely.com)
2. Click on your profile icon in the top-right corner
3. Select **API Keys** from the dropdown menu
4. Click **Generate New API Key**
5. Copy the **API Key** and **API Secret** - you'll need both for n8n
6. Note your **Host URL** (e.g., `https://company.sendsafely.com` or `https://app.sendsafely.com`)

### Configuring Credentials in n8n

1. In n8n, go to **Credentials** > **New**
2. Search for and select **SendSafely API**
3. Enter the following information:
   - **Host**: Your SendSafely host URL (e.g., `https://app.sendsafely.com`)
   - **API Key**: Your SendSafely API Key
   - **API Secret**: Your SendSafely API Secret
4. Click **Save**

## Supported Operations

### Package Operations

- **Create Package**: Create a new secure package for file sharing
  - Set package description
  - Specify package life (expiration)
  - Configure notification preferences

- **Get Package**: Retrieve information about an existing package
  - Get package details and metadata
  - View recipient list
  - Check package status

- **Finalize Package**: Finalize a package to make it available to recipients
  - Automatically sends notification emails
  - Locks the package from further modifications

- **Delete Package**: Delete a package and all associated files
  - Permanently removes package
  - Revokes recipient access

### File Operations

- **Upload File**: Upload a file to a package
  - Binary data support
  - Automatic encryption
  - Progress tracking

- **Download File**: Download a file from a package
  - Automatic decryption
  - Binary data output

### Recipient Operations

- **Add Recipient**: Add a recipient to a package
  - Email-based recipient management
  - Optional SMS verification
  - Custom access permissions

- **Remove Recipient**: Remove a recipient from a package
  - Revoke access immediately
  - Audit trail maintained

## Usage Examples

### Example 1: Create Package and Upload File

```json
{
  "nodes": [
    {
      "name": "Create Secure Package",
      "type": "n8n-nodes-sendsafely.sendSafely",
      "parameters": {
        "resource": "package",
        "operation": "create",
        "description": "Q4 Financial Reports",
        "life": 30
      }
    },
    {
      "name": "Upload File",
      "type": "n8n-nodes-sendsafely.sendSafely",
      "parameters": {
        "resource": "file",
        "operation": "upload",
        "packageId": "={{ $json.packageId }}",
        "binaryData": true,
        "binaryPropertyName": "data"
      }
    }
  ]
}
```

### Example 2: Send Secure File to Multiple Recipients

1. Create a package
2. Upload file(s)
3. Add recipients
4. Finalize package (triggers notifications)

### Example 3: Download and Process Files

1. Get package details
2. Download file from package
3. Process the decrypted file data
4. Save or forward as needed

## Compatibility

- **n8n version**: 2.0 or above
- **Node.js version**: 18.0 or above
- **SendSafely API**: v2.0

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [SendSafely API Documentation](https://www.sendsafely.com/api-documentation/)
- [SendSafely Developer Portal](https://www.sendsafely.com/developers/)
- [n8n Documentation](https://docs.n8n.io/)

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/jedarden/n8n-nodes-sendsafely.git
cd n8n-nodes-sendsafely

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Testing Locally

1. Build the node: `npm run build`
2. Link to your n8n installation: `npm link`
3. In your n8n directory: `npm link n8n-nodes-sendsafely`
4. Restart n8n

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

- For issues with this node, please [open an issue](https://github.com/jedarden/n8n-nodes-sendsafely/issues)
- For n8n related questions, visit the [n8n forum](https://community.n8n.io/)
- For SendSafely API questions, contact [SendSafely support](https://www.sendsafely.com/support/)

## Security

This node handles sensitive data and credentials. Please ensure:

- Never commit API credentials to version control
- Use n8n's credential encryption features
- Keep your n8n instance and this node up to date
- Follow SendSafely's security best practices

To report security vulnerabilities, please email security@ardenone.com instead of using the issue tracker.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the [n8n](https://n8n.io) workflow automation platform
- Powered by the [SendSafely](https://www.sendsafely.com) API
- Thanks to the n8n community for support and feedback

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

---

Made with care by the n8n community
