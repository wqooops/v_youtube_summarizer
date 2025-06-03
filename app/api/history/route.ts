import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function extractTitleFromContent(content: string): string {
  try {
    const lines = content.split('\n');
    // Look for title in different formats
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('🎯 TITLE:') ||
          trimmedLine.startsWith('🎯 TITEL:') ||
          trimmedLine.startsWith('🎙️ TITLE:') ||
          trimmedLine.startsWith('🎙️ TITEL:')) {
        const title = trimmedLine.split(':')[1].trim();
        if (title) return title;
      }
    }
    // Fallback: Use first non-empty line if no title marker found
    const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
    if (firstNonEmptyLine) {
      return firstNonEmptyLine.trim().replace(/^[🎯🎙️]\s*/, '');
    }
  } catch (error) {
    console.error('Error extracting title:', error);
  }
  return 'Untitled Summary';
}

export async function GET() {
  try {
    // Test database connection first
    await prisma.$connect();
    
    const summaries = await prisma.summary.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    const processedSummaries = summaries.map(summary => ({
      ...summary,
      title: extractTitleFromContent(summary.content)
    }));

    return NextResponse.json({ summaries: processedSummaries });
  } catch (error: any) {
    console.error('Error fetching summaries:', error);
    
    // Check if it's a database connection error
    if (error.code === 'P1001' || error.message?.includes('database') || error.message?.includes('connect')) {
      return NextResponse.json(
        { 
          error: 'Database not configured', 
          message: 'Please configure DATABASE_URL environment variable',
          summaries: [] // Return empty array as fallback
        },
        { status: 200 } // Return 200 instead of 500 to avoid blocking the UI
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch summaries', summaries: [] },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}