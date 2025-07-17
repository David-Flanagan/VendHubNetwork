# Debugging and Troubleshooting Guide

## Overview
This document outlines the debugging process and solutions for issues encountered during the referral system implementation.

## Issues Encountered and Solutions

### 1. Empty Referrals Tab Issue

#### Problem
- Customer dashboard showed empty "My Referrals" tab
- Console logs showed 0 machines found
- User expected to see machines where they were the referral user

#### Root Cause Analysis
1. **Database Query**: Initially showed 0 machines in entire `customer_machines` table
2. **RLS Policy**: Missing policy to allow customers to view machines where they are referral users
3. **Data Verification**: Confirmed user exists and machines exist with referral_user_id

#### Solution
- **Added RLS Policy**: Created policy allowing customers to view machines where `referral_user_id = auth.uid()`
- **Verified Data**: Confirmed machines exist with proper referral_user_id values

### 2. ReferenceError: user is not defined

#### Problem
- CustomerMachineCard component threw error: `ReferenceError: user is not defined`
- Error occurred when trying to access `user?.id` for referral comparison

#### Root Cause
- Component was using `user` variable without importing `useAuth` hook
- Missing import: `import { useAuth } from '@/contexts/AuthContext'`
- Missing hook usage: `const { user } = useAuth()`

#### Solution
```typescript
// Added to CustomerMachineCard.tsx
import { useAuth } from '@/contexts/AuthContext'

export default function CustomerMachineCard({ machine, onUpdate }: CustomerMachineCardProps) {
  const { user } = useAuth()
  // ... rest of component
}
```

### 3. Layout Formatting Issue

#### Problem
- Commission percentage was overlapping with "Commission:" label
- Text was cramped and hard to read

#### Root Cause
- Fixed width `w-16` (64px) was too narrow for "Commission:" label
- Label text was longer than allocated space

#### Solution
- **Increased width**: Changed from `w-16` to `w-24` (96px)
- **Result**: Proper spacing between label and percentage value

### 4. SQL Syntax Errors

#### Problem
- Initial test data script had syntax errors
- Error: `syntax error at or near ")"`

#### Root Cause
- Complex subqueries in VALUES clause
- Missing columns or constraint issues
- Overly complex INSERT statements

#### Solution
- **Simplified approach**: Used SELECT subqueries instead of direct VALUES
- **Removed problematic columns**: Excluded columns that might not exist
- **Created simpler script**: `create-test-machines-simple.sql`

## Debugging Techniques Used

### 1. Console Logging
```typescript
// Added comprehensive logging to understand data flow
console.log('Loading referral machines for user:', userId)
console.log('Referral query result:', result)
console.log('Machines that should match our user ID:', machines)
```

### 2. Database Queries
```sql
-- Diagnostic queries to understand data state
SELECT COUNT(*) FROM customer_machines;
SELECT * FROM customer_machines WHERE referral_user_id IS NOT NULL;
SELECT auth.uid() as current_user_id;
```

### 3. RLS Policy Verification
```sql
-- Check existing policies
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'customer_machines';
```

### 4. Step-by-Step Testing
1. **Verify user exists** in users table
2. **Check if machines exist** in customer_machines table
3. **Verify referral_user_id values** are set correctly
4. **Test RLS policies** with direct queries
5. **Check frontend data loading** with console logs

## Common Debugging Patterns

### 1. Data Flow Debugging
```
Frontend Request → Database Query → RLS Policy Check → Data Return → UI Display
```

### 2. RLS Policy Debugging
- **Check if policy exists**: Query pg_policies table
- **Test policy manually**: Run queries as different users
- **Verify auth.uid()**: Ensure user context is available

### 3. Component Debugging
- **Check imports**: Ensure all required hooks are imported
- **Verify props**: Ensure data is being passed correctly
- **Test conditional rendering**: Verify conditions are working

## Prevention Strategies

### 1. Database Changes
- **Always test RLS policies** after schema changes
- **Use migration files** for reproducible changes
- **Test with actual user data** not just admin queries

### 2. Frontend Development
- **Import required hooks** at the top of components
- **Add error boundaries** for better error handling
- **Use TypeScript** to catch type errors early

### 3. Testing
- **Test with real data** not just empty states
- **Verify user permissions** for different user types
- **Check responsive design** on different screen sizes

## Tools and Commands Used

### Database Tools
- **Supabase SQL Editor**: For running queries and migrations
- **pg_policies**: For checking RLS policies
- **information_schema**: For checking table structure

### Frontend Tools
- **Browser Console**: For debugging JavaScript errors
- **React DevTools**: For component state inspection
- **Network Tab**: For API request debugging

### Development Commands
```bash
# Restart development server
npm run dev

# Check for TypeScript errors
npx tsc --noEmit

# Clear Next.js cache
rm -rf .next
```

## Lessons Learned

1. **RLS policies are critical** for proper data access control
2. **Always import required hooks** before using them
3. **Test with real data** to catch edge cases
4. **Use step-by-step debugging** to isolate issues
5. **Document debugging process** for future reference

## Notes for Future AI Agents

- **Always check RLS policies** when users can't access expected data
- **Verify imports and hooks** when components throw undefined errors
- **Test layout with real content** to catch formatting issues
- **Use console logging** strategically to understand data flow
- **Create simple test cases** before complex implementations 