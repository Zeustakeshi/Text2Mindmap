"""
CTM (Compact Tree Markup) Validator

Validates mindmap output from LLM to ensure it follows CTM format rules.
"""

import re
from typing import TypedDict


class ValidationResult(TypedDict):
    is_valid: bool
    message: str


def validate_ctm(message: str) -> ValidationResult:
    """
    Validate a CTM format string returned from LLM.
    
    Args:
        message: The CTM format string to validate
        
    Returns:
        ValidationResult with is_valid and message fields
    """

    # Strip markdown code blocks if present
    message = _strip_markdown_blocks(message)

    # Check for empty input
    if not message or not message.strip():
        return {
            "is_valid": False,
            "message": "Input is empty. Expected CTM format content."
        }

    lines = message.strip().split('\n')

    # Filter out empty lines and track if there were any
    non_empty_lines = []
    has_blank_lines = False
    prev_was_content = False

    for line in lines:
        if line.strip() == '':
            if prev_was_content:
                has_blank_lines = True
            continue
        non_empty_lines.append(line)
        prev_was_content = True

    if not non_empty_lines:
        return {
            "is_valid": False,
            "message": "No valid content found. Expected CTM format nodes."
        }

    # Warning about blank lines (not a hard error but noted)
    warnings = []
    if has_blank_lines:
        warnings.append("Warning: Blank lines detected between nodes (should be avoided).")

    # Validate first line is root (level 0)
    first_line = non_empty_lines[0]
    first_level = _count_level(first_line)

    if first_level != 0:
        return {
            "is_valid": False,
            "message": f"Line 1: Root node must not have any '>' prefix. Found {first_level} '>' character(s)."
        }

    # Track the current level for continuity check
    prev_level = 0

    for i, line in enumerate(non_empty_lines):
        line_num = i + 1

        # Check for spaces around '>' characters
        space_error = _check_spaces_around_markers(line)
        if space_error:
            return {
                "is_valid": False,
                "message": f"Line {line_num}: {space_error}"
            }

        # Count current level
        current_level = _count_level(line)

        # Validate label is not empty
        label = _extract_label(line)
        if not label:
            return {
                "is_valid": False,
                "message": f"Line {line_num}: Node label is empty. Each node must have a label."
            }

        # Check for level skip (going down more than 1 level at a time)
        if current_level > prev_level + 1:
            return {
                "is_valid": False,
                "message": (
                    f"Line {line_num}: Level skip detected! "
                    f"Jumped from level {prev_level} to level {current_level}. "
                    f"You can only increment by 1 level at a time. "
                    f"Missing parent node at level {prev_level + 1}."
                )
            }

        # Check for invalid characters in markers (only '>' allowed for indentation)
        prefix = _get_prefix(line)
        if prefix and not all(c == '>' for c in prefix):
            return {
                "is_valid": False,
                "message": f"Line {line_num}: Invalid indentation characters. Only '>' is allowed for indentation."
            }

        prev_level = current_level

    # Validate attributes format if present
    for i, line in enumerate(non_empty_lines):
        line_num = i + 1
        attr_error = _validate_attributes(line)
        if attr_error:
            return {
                "is_valid": False,
                "message": f"Line {line_num}: {attr_error}"
            }

    # All validations passed
    warning_text = " ".join(warnings) if warnings else ""
    success_message = f"Valid CTM format with {len(non_empty_lines)} nodes."
    if warning_text:
        success_message += f" {warning_text}"

    return {
        "is_valid": True,
        "message": success_message
    }


def _strip_markdown_blocks(text: str) -> str:
    """Remove markdown code block wrappers if present."""
    text = text.strip()

    # Pattern to match ```ctm, ```txt, ``` or similar
    patterns = [
        r'^```(?:ctm|txt|text|plaintext)?\s*\n(.*?)\n```$',
        r'^```(?:ctm|txt|text|plaintext)?\s*\n(.*?)```$',
    ]

    for pattern in patterns:
        match = re.match(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

    # Also try simple removal
    if text.startswith('```') and text.endswith('```'):
        # Remove first line (```...) and last (```)
        lines = text.split('\n')
        if len(lines) >= 2:
            return '\n'.join(lines[1:-1]).strip()

    return text


def _count_level(line: str) -> int:
    """Count the number of '>' at the start of the line (indentation level)."""
    count = 0
    for char in line:
        if char == '>':
            count += 1
        else:
            break
    return count


def _get_prefix(line: str) -> str:
    """Get the prefix characters (everything before the label)."""
    match = re.match(r'^([>]+)', line)
    return match.group(1) if match else ""


def _extract_label(line: str) -> str:
    """Extract the label from a CTM line (without level markers and attributes)."""
    # Remove leading '>' characters
    content = line.lstrip('>')

    # Remove attributes (everything after unescaped |)
    # Handle escaped pipes \|
    label = ""
    i = 0
    while i < len(content):
        if content[i] == '\\' and i + 1 < len(content):
            # Escaped character, keep both
            label += content[i:i + 2]
            i += 2
        elif content[i] == '|':
            # Unescaped pipe, stop here
            break
        else:
            label += content[i]
            i += 1

    return label.strip()


def _check_spaces_around_markers(line: str) -> str | None:
    """Check for invalid spaces around '>' markers."""
    # Check for space before first '>'
    if line.startswith(' ') or line.startswith('\t'):
        return "Line starts with whitespace. Remove spaces/tabs before '>' markers."

    # Check for spaces between '>' characters or immediately after
    prefix_match = re.match(r'^(>+)', line)
    if prefix_match:
        prefix = prefix_match.group(1)
        after_prefix = line[len(prefix):]

        # Check if prefix contains spaces (shouldn't be possible but safe check)
        if ' ' in prefix or '\t' in prefix:
            return "Spaces found within '>' markers. Remove all spaces from indentation."

        # Check for space immediately after prefix before label
        if after_prefix.startswith(' ') or after_prefix.startswith('\t'):
            return "Space after '>' markers. Label should immediately follow '>' without spaces."

    return None


def _validate_attributes(line: str) -> str | None:
    """Validate attribute format if present (|key:value,key2:value2)."""
    # Find unescaped pipe
    content = line.lstrip('>')

    pipe_pos = -1
    i = 0
    while i < len(content):
        if content[i] == '\\' and i + 1 < len(content):
            i += 2
            continue
        if content[i] == '|':
            pipe_pos = i
            break
        i += 1

    if pipe_pos == -1:
        return None  # No attributes, that's fine

    attr_str = content[pipe_pos + 1:]

    if not attr_str.strip():
        return "Attribute section is empty after '|'. Either remove '|' or add attributes."

    # Parse attributes (key:value pairs separated by commas)
    # Handle escaped characters: \| \: \, \> \\
    pairs = []
    current_pair = ""
    j = 0

    while j < len(attr_str):
        if attr_str[j] == '\\' and j + 1 < len(attr_str):
            current_pair += attr_str[j:j + 2]
            j += 2
            continue
        if attr_str[j] == ',':
            pairs.append(current_pair.strip())
            current_pair = ""
            j += 1
            continue
        current_pair += attr_str[j]
        j += 1

    if current_pair.strip():
        pairs.append(current_pair.strip())

    # Validate each pair has key:value format
    for pair in pairs:
        if not pair:
            continue

        # Find unescaped colon
        colon_pos = -1
        k = 0
        while k < len(pair):
            if pair[k] == '\\' and k + 1 < len(pair):
                k += 2
                continue
            if pair[k] == ':':
                colon_pos = k
                break
            k += 1

        if colon_pos == -1:
            return f"Invalid attribute format '{pair}'. Expected 'key:value' format."

        key = pair[:colon_pos].strip()
        value = pair[colon_pos + 1:].strip()

        if not key:
            return f"Attribute key is empty in '{pair}'."

    return None


# Convenience function for quick validation
def is_valid_ctm(message: str) -> bool:
    """Quick check if message is valid CTM format."""
    return validate_ctm(message)["is_valid"]
