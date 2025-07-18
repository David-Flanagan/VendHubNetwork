import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const authHeader = request.headers.get('authorization')

    if (!machineId || !startDate || !endDate || !authHeader) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Nayax Lynx API endpoint for last sales
    const nayaxApiUrl = `https://lynx.nayax.com/operational/v1/machines/${machineId}/lastSales`
    
    console.log('Making Nayax API call to:', nayaxApiUrl)
    console.log('Parameters:', { machineId, startDate, endDate })
    console.log('Token (masked):', token.substring(0, 4) + '-****-****-****')

    // Make the actual API call to Nayax
    const response = await fetch(nayaxApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Nayax API error:', response.status, errorText)
      return NextResponse.json(
        { 
          error: 'Nayax API call failed',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Log the response structure for analysis
    console.log('Nayax API Response Structure:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      dataKeys: Object.keys(data),
      dataType: typeof data,
      isArray: Array.isArray(data),
      totalTransactions: Array.isArray(data) ? data.length : 0
    })

    // Detailed analysis of transaction structure
    if (Array.isArray(data) && data.length > 0) {
      const sampleTransaction = data[0]
      console.log('Sample Transaction Fields:', Object.keys(sampleTransaction))
      console.log('Sample Transaction Values:', sampleTransaction)
      
      // Analyze data types and patterns
      const fieldAnalysis: Record<string, any> = {}
      Object.keys(sampleTransaction).forEach(field => {
        const values = data.map((t: any) => t[field]).filter(v => v !== null && v !== undefined)
        fieldAnalysis[field] = {
          type: typeof sampleTransaction[field],
          uniqueValues: [...new Set(values)].length,
          hasNulls: data.some((t: any) => t[field] === null),
          sampleValues: [...new Set(values)].slice(0, 3)
        }
      })
      console.log('Field Analysis:', fieldAnalysis)
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in Nayax API test:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 
