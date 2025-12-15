# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-15

### Added

#### Core Features
- Initial release of n8n-nodes-sendsafely
- Full SendSafely API integration for secure file sharing workflows
- Comprehensive TypeScript implementation with type safety

#### Package Operations
- **Create Package**: Create new secure packages with customizable settings
  - Package description support
  - Configurable package expiration (life parameter)
  - Notification preferences
- **Get Package**: Retrieve package information and metadata
  - Package details and status
  - Recipient list retrieval
  - File list and metadata
- **Finalize Package**: Complete package setup and notify recipients
  - Automatic email notifications
  - Package locking mechanism
- **Delete Package**: Permanently remove packages and revoke access
  - Complete package removal
  - Audit trail preservation

#### File Operations
- **Upload File**: Secure file upload with encryption
  - Binary data support
  - Automatic client-side encryption
  - Progress tracking capabilities
  - Multiple file format support
- **Download File**: Secure file download with decryption
  - Automatic decryption
  - Binary data output
  - Stream handling for large files

#### Recipient Management
- **Add Recipient**: Add recipients to packages
  - Email-based recipient management
  - SMS verification support
  - Custom access permissions
  - Email notification triggers
- **Remove Recipient**: Revoke recipient access
  - Immediate access revocation
  - Audit trail maintenance

#### Security & Authentication
- SendSafely API credentials integration
  - API Key authentication
  - API Secret management
  - Secure credential storage using n8n's credential system
  - Host URL configuration support

#### Developer Experience
- Comprehensive error handling and validation
- Detailed API response mapping
- User-friendly parameter descriptions
- Input validation for all operations
- TypeScript definitions for type safety

#### Testing & Quality
- Jest test framework integration
- Unit tests for all core operations
- ESLint configuration for code quality
- Prettier for code formatting
- TypeScript strict mode enabled

#### Documentation
- Complete README with installation instructions
- API credential setup guide
- Usage examples for common workflows
- Compatibility information
- Contributing guidelines
- Security best practices

#### CI/CD
- GitHub Actions workflow for continuous integration
  - Automated testing on Node.js 18 and 20
  - Linting and type checking
  - Build verification
  - Optional Codecov integration
- Automated release workflow
  - NPM publishing automation
  - GitHub release creation
  - Changelog integration
- Security audit workflow
  - Weekly dependency audits
  - Vulnerability scanning
  - CodeQL analysis
  - Dependency review for PRs

#### Build & Distribution
- Modern build pipeline with TypeScript
- NPM package configuration
- n8n community node metadata
- Proper dependency management
- ES modules and CommonJS support

### Technical Details

#### Dependencies
- n8n-workflow: ^2.0.0
- axios: ^1.7.0
- form-data: ^4.0.1

#### Development Dependencies
- TypeScript: ^5.7.0
- Jest: ^29.7.0
- ESLint: ^9.17.0
- Prettier: ^3.4.2
- ts-jest: ^29.2.0

#### Compatibility
- n8n version: 2.0+
- Node.js version: 18+
- SendSafely API: v2.0

### Known Limitations
- Large file uploads (>2GB) may require chunking optimization
- Batch operations require separate workflow nodes
- SMS verification codes must be handled manually

### Breaking Changes
None - initial release

### Migration Guide
Not applicable - initial release

---

## Future Roadmap

### Planned for v1.1.0
- Batch file upload support
- Advanced package configuration options
- Webhook integration for package events
- Enhanced error messages with recovery suggestions

### Planned for v1.2.0
- Package template support
- Bulk recipient operations
- File encryption key management
- Advanced permission controls

### Under Consideration
- Dropzone integration
- Contact group management
- Package analytics and reporting
- Custom branding support

---

[1.0.0]: https://github.com/yourusername/n8n-nodes-sendsafely/releases/tag/v1.0.0
