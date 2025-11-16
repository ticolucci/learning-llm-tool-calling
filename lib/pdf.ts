/**
 * PDF generation from HTML checklist
 * Server action for generating downloadable packing lists
 */

'use server';

export interface ChecklistItem {
  item: string;
  category?: string;
  quantity?: number;
  packed?: boolean;
}

export interface ChecklistData {
  destination: string;
  startDate: string;
  endDate: string;
  items: ChecklistItem[];
}

/**
 * Generate PDF from checklist data
 * Returns a base64-encoded PDF
 */
export async function generatePDF(
  checklist: ChecklistData
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    // TODO: Implement actual PDF generation
    // For now, return a mock success response
    // In production, use a library like @react-pdf/renderer or puppeteer

    const html = generateChecklistHTML(checklist);

    return {
      success: true,
      pdf: Buffer.from(html).toString('base64'),
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate HTML representation of checklist
 */
function generateChecklistHTML(checklist: ChecklistData): string {
  const { destination, startDate, endDate, items } = checklist;

  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Packing Checklist - ${destination}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }
    .trip-info {
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 5px;
    }
    .category {
      margin: 30px 0;
    }
    .category h2 {
      color: #555;
      font-size: 1.2em;
      margin-bottom: 10px;
    }
    .item {
      padding: 8px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
    }
    .item:before {
      content: "☐ ";
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <h1>Packing Checklist</h1>
  <div class="trip-info">
    <strong>Destination:</strong> ${destination}<br>
    <strong>Dates:</strong> ${startDate} to ${endDate}
  </div>
  ${Object.entries(groupedItems)
    .map(
      ([category, categoryItems]) => `
    <div class="category">
      <h2>${category}</h2>
      ${categoryItems
        .map(
          (item) => `
        <div class="item">
          <span>${item.item}</span>
          <span>${item.quantity ? `x${item.quantity}` : ''}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('')}
</body>
</html>
  `;
}
