const fieldInput = document.querySelector("#fieldInput");
const valuesInput = document.querySelector("#valuesInput");
const quoteMode = document.querySelector("#quoteMode");
const removeDuplicateInput = document.querySelector("#removeDuplicateInput");
const sortNumericField = document.querySelector("#sortNumericField");
const sortNumericInput = document.querySelector("#sortNumericInput");
const sortDirectionButton = document.querySelector("#sortDirectionButton");
const valuesPerLineInput = document.querySelector("#valuesPerLineInput");
const outputText = document.querySelector("#outputText");
const copyButton = document.querySelector("#copyButton");
const statusText = document.querySelector("#statusText");

function splitValues(rawText) {
  const text = stripOuterParentheses(rawText.trim());
  const values = [];
  let currentValue = "";
  let quoteChar = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoteChar) {
      if (char === quoteChar && nextChar === quoteChar) {
        currentValue += char;
        index += 1;
      } else if (char === quoteChar) {
        quoteChar = "";
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quoteChar = char;
      continue;
    }

    if (char === "," || char === "\n" || char === "\r") {
      pushValue(values, currentValue);
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  pushValue(values, currentValue);
  return values;
}

function stripOuterParentheses(value) {
  if (value.startsWith("(") && value.endsWith(")")) {
    return value.slice(1, -1);
  }

  return value;
}

function pushValue(values, value) {
  const normalizedValue = value.trim();

  if (normalizedValue) {
    values.push(normalizedValue);
  }
}

function quoteSqlValue(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function doubleQuoteSqlValue(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function removeDuplicateValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function isNumericValue(value) {
  return value !== "" && Number.isFinite(Number(value));
}

function updateSortAvailability(values) {
  const hasNonNumericValue = values.some((value) => !isNumericValue(value));

  sortNumericInput.disabled = hasNonNumericValue;
  sortDirectionButton.disabled = hasNonNumericValue;
  sortNumericField.classList.toggle("is-disabled", hasNonNumericValue);

  if (hasNonNumericValue) {
    sortNumericInput.checked = false;
  }
}

function formatSqlValues(values, valuesPerLine) {
  if (!valuesPerLine || valuesPerLine <= 0 || values.length <= valuesPerLine) {
    return values.join(",");
  }

  const lines = [];
  for (let index = 0; index < values.length; index += valuesPerLine) {
    lines.push(`  ${values.slice(index, index + valuesPerLine).join(",")}`);
  }

  return `\n${lines.join(",\n")}\n`;
}

function buildSqlIn() {
  const fieldName = fieldInput.value.trim() || "FIELD_NAME";
  let values = splitValues(valuesInput.value);
  const valuesPerLine = Number.parseInt(valuesPerLineInput.value, 10);

  updateSortAvailability(values);

  if (removeDuplicateInput.checked) {
    values = removeDuplicateValues(values);
  }

  if (sortNumericInput.checked) {
    const sortMultiplier = sortDirectionButton.dataset.direction === "desc" ? -1 : 1;
    values = [...values].sort((a, b) => (Number(a) - Number(b)) * sortMultiplier);
  }

  const formattedValues = values.map((value) => {
    if (quoteMode.value === "single") {
      return quoteSqlValue(value);
    }

    if (quoteMode.value === "double") {
      return doubleQuoteSqlValue(value);
    }

    return value;
  });

  outputText.value = formattedValues.length
    ? `WHERE ${fieldName} IN (${formatSqlValues(formattedValues, valuesPerLine)})`
    : "";
}

function flashStatus(message) {
  statusText.textContent = message;
  window.clearTimeout(flashStatus.timeoutId);
  flashStatus.timeoutId = window.setTimeout(() => {
    statusText.textContent = "";
  }, 1800);
}

async function copyOutput() {
  buildSqlIn();

  if (!outputText.value) {
    flashStatus("No SQL to copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    flashStatus("Copied");
  } catch {
    outputText.select();
    document.execCommand("copy");
    flashStatus("Copied");
  }
}

[fieldInput, valuesInput, quoteMode, removeDuplicateInput, sortNumericInput, valuesPerLineInput].forEach((element) => {
  element.addEventListener("input", buildSqlIn);
  element.addEventListener("change", buildSqlIn);
});

copyButton.addEventListener("click", copyOutput);
sortDirectionButton.addEventListener("click", () => {
  const nextDirection = sortDirectionButton.dataset.direction === "desc" ? "asc" : "desc";
  sortDirectionButton.dataset.direction = nextDirection;
  sortDirectionButton.textContent = nextDirection.toUpperCase();
  buildSqlIn();
});

buildSqlIn();
