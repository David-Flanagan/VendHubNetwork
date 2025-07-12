# Development Rules

## Core Development Guidelines

### 1. No Fake Data Creation
- **Do not create fake data unless explicitly requested**
- Always ask before adding sample/test data to the system
- Use real data or empty states instead of mock data

### 2. Code Implementation Process
- **Always explain what you're going to do before implementing**
- Ask for permission before writing any code
- Provide clear reasoning for implementation decisions
- Wait for approval before proceeding

### 3. Supabase Integration
- **Use Supabase where possible for all backend functionality**
- Check for existing tables before creating new ones
- Verify table structure and relationships
- Use Row Level Security (RLS) for data protection

### 4. Communication
- **Ask questions if confused or unclear about requirements**
- Clarify specifications before implementation
- Confirm understanding of user needs
- Don't make assumptions about requirements

### 5. Version Control
- **Push to git regularly**
- Create meaningful commit messages
- Keep commits focused and atomic
- Maintain clean git history

## Additional Guidelines

### Code Quality
- Use TypeScript for type safety
- Follow React/Next.js best practices
- Implement proper error handling
- Write clean, readable code

### User Experience
- Build with placeholder-heavy layouts initially
- Focus on functionality before polish
- Ensure responsive design
- Provide clear user feedback

### Security
- Use proper authentication flows
- Implement role-based access control
- Validate user permissions
- Protect sensitive data

### Testing
- Test functionality thoroughly
- Verify database operations
- Check for edge cases
- Ensure proper error states

## Project-Specific Rules

### VendHub Network Specific
- Use the user_roles table system for role checks (not JWT claims)
- Implement operator-customer relationship features
- Build global product catalog functionality
- Focus on vending machine marketplace features

### UI/UX Preferences
- Use React and Next.js for frontend
- Implement Tailwind CSS for styling
- Use buttons instead of dropdowns for filtering
- Start with placeholder layouts before functional components

---

**Remember**: Always communicate clearly, ask for permission, and follow these guidelines to ensure successful project development. 