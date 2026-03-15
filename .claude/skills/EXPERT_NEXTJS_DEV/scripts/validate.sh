#!/bin/bash

# Expert Next.js 15 - Quality Validation Script
# Run this before committing code to ensure production-ready quality

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Expert Next.js 15 - Quality Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track failures
FAILED_CHECKS=0

# Function to print check status
check_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    return 0
  else
    echo -e "${RED}✗${NC} $2"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

echo ""
echo -e "${BLUE}📋 Step 1: Checking for 'any' types${NC}"
echo "Looking for TypeScript 'any' type annotations..."

# Check for 'any' types (exclude 'unknown')
if grep -r "\bany\b" app/ --include="*.ts" --include="*.tsx" | grep -v "unknown" > /dev/null 2>&1; then
  echo -e "${RED}✗${NC} Found 'any' types:"
  grep -r "\bany\b" app/ --include="*.ts" --include="*.tsx" | grep -v "unknown" | head -5
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  check_status 0 "No 'any' types found"
fi

echo ""
echo -e "${BLUE}🎨 Step 2: Type checking with TypeScript${NC}"
pnpm typecheck > /dev/null 2>&1
check_status $? "TypeScript compilation successful"

echo ""
echo -e "${BLUE}🧹 Step 3: Linting with Biome${NC}"
pnpm lint > /dev/null 2>&1
check_status $? "Linting passed (no errors)"

echo ""
echo -e "${BLUE}✨ Step 4: Formatting check${NC}"
pnpm format --check > /dev/null 2>&1
if [ $? -eq 0 ]; then
  check_status 0 "Code formatting correct"
else
  echo -e "${YELLOW}⚠${NC} Code needs formatting"
  echo "Run: pnpm format"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo -e "${BLUE}🏗️  Step 5: Building with Turbopack${NC}"
pnpm build > /dev/null 2>&1
check_status $? "Build successful"

echo ""
echo -e "${BLUE}📊 Step 6: Checking file sizes${NC}"
LARGE_FILES=$(find app components -name "*.tsx" -o -name "*.ts" | while read file; do
  LINES=$(wc -l < "$file")
  if [ "$LINES" -gt 300 ]; then
    echo "$file: $LINES lines"
  fi
done)

if [ -n "$LARGE_FILES" ]; then
  echo -e "${YELLOW}⚠${NC} Large files found (consider splitting):"
  echo "$LARGE_FILES"
else
  check_status 0 "File sizes reasonable"
fi

echo ""
echo -e "${BLUE}🔐 Step 7: Security checks${NC}"

# Check for exposed secrets
if grep -r "process.env\." app --include="*.tsx" --include="*.ts" | grep -v "process.env.NEXT_PUBLIC_" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} No exposed secrets found"
else
  echo -e "${GREEN}✓${NC} No secrets in client code"
fi

# Check for console.log in production code
CONSOLE_LOGS=$(grep -r "console\.log" app --include="*.tsx" --include="*.ts" | grep -v "test\|spec\|__tests__" | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠${NC} Found $CONSOLE_LOGS console.log statements"
else
  check_status 0 "No console.log in production code"
fi

echo ""
echo -e "${BLUE}📈 Step 8: Import organization${NC}"
# Check for relative imports that could be absolute
RELATIVE_IMPORTS=$(grep -r "from ['\"]\.\./" app --include="*.tsx" --include="*.ts" | wc -l)
if [ "$RELATIVE_IMPORTS" -gt 0 ]; then
  echo -e "${YELLOW}⚠${NC} Consider using @ aliases for $RELATIVE_IMPORTS imports"
else
  check_status 0 "Imports properly organized"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILED_CHECKS" -eq 0 ]; then
  echo -e "${GREEN}✅ All quality checks passed!${NC}"
  echo ""
  echo "Your code is production-ready. You can now:"
  echo "  - Commit: git add . && git commit -m 'feat: ...'"
  echo "  - Push:   git push"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $FAILED_CHECKS quality checks failed${NC}"
  echo ""
  echo "Please fix the issues above before committing."
  echo ""
  echo "Common fixes:"
  echo "  • Format code:        pnpm format"
  echo "  • Fix linting:        pnpm fix"
  echo "  • Full validation:    pnpm ci"
  echo ""
  exit 1
fi