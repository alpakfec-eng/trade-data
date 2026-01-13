import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvText = await file.text();

    // Parse CSV
    const { data, errors, meta } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'CSV parsing error', details: errors }, { status: 400 });
    }

    console.log('CSV Headers found:', meta.fields);
    console.log('First row sample:', data[0]);

    // Field mapping to handle case sensitivity and variations
    const fieldMapping: Record<string, string> = {
      'hs code': 'HS CODE',
      'hscode': 'HS CODE',
      'HS Code': 'HS CODE',
      'product name': 'Product Name',
      'productname': 'Product Name',
      'Product Name': 'Product Name',
      'product category': 'Product Category',
      'productcategory': 'Product Category',
      'Product Category': 'Product Category',
      'item description': 'Item Description',
      'itemdescription': 'Item Description',
      'Item Description': 'Item Description',
      'grade': 'Grade',
      'Grade': 'Grade',
      'grade category': 'Grade Category',
      'gradecategory': 'Grade Category',
      'Grade Category': 'Grade Category',
      'origin': 'Origin',
      'Origin': 'Origin',
      'origin2': 'Origin2',
      'Origin2': 'Origin2',
      'actual lc date': 'Actual LC Date',
      'actuallcdate': 'Actual LC Date',
      'Actual LC Date': 'Actual LC Date',
      'lc date': 'LC Date',
      'lcdate': 'LC Date',
      'LC Date': 'LC Date',
      'no. of days - shipment': 'No. of Days - Shipment',
      'noofdays-shipment': 'No. of Days - Shipment',
      'No. of Days - Shipment': 'No. of Days - Shipment',
      'importer category': 'Importer Category',
      'importercategory': 'Importer Category',
      'Importer Category': 'Importer Category',
      'actual importer name': 'Actual Importer Name',
      'actualimportername': 'Actual Importer Name',
      'Actual Importer Name': 'Actual Importer Name',
      'importer name': 'Importer Name',
      'importername': 'Importer Name',
      'Importer Name': 'Importer Name',
      'imp group': 'Imp Group',
      'impgroup': 'Imp Group',
      'Imp Group': 'Imp Group',
      'importer address': 'Importer Address',
      'importeraddress': 'Importer Address',
      'Importer Address': 'Importer Address',
      'agent name': 'Agent Name',
      'agentname': 'Agent Name',
      'Agent Name': 'Agent Name',
      'actual consignor name': 'Actual Consignor Name',
      'actualconsignorname': 'Actual Consignor Name',
      'Actual Consignor Name': 'Actual Consignor Name',
      'consignor name': 'Consignor Name',
      'consignorname': 'Consignor Name',
      'Consignor Name': 'Consignor Name',
      'consignor group': 'Consignor Group',
      'consignorgroup': 'Consignor Group',
      'Consignor Group': 'Consignor Group',
      'consignor group 12 words': 'Consignor Group 12 Words',
      'consignorgroup12words': 'Consignor Group 12 Words',
      'Consignor Group 12 Words': 'Consignor Group 12 Words',
      'assessed value': 'Assessed Value',
      'assessedvalue': 'Assessed Value',
      'Assessed Value': 'Assessed Value',
      'assessed unit': 'Assessed Unit',
      'assessedunit': 'Assessed Unit',
      'Assessed Unit': 'Assessed Unit',
      'dcl unit': 'DCL Unit',
      'dclunit': 'DCL Unit',
      'DCL Unit': 'DCL Unit',
      'dcl val': 'DCL Val',
      'dclval': 'DCL Val',
      'DCL Val': 'DCL Val',
      'qty (kg)': 'Qty (Kg)',
      'qtykg': 'Qty (Kg)',
      'Qty (Kg)': 'Qty (Kg)',
      'price/kg': 'Price/Kg',
      'pricekg': 'Price/Kg',
      'Price/Kg': 'Price/Kg',
      'qty (mts)': 'QTY (Mts)',
      'qtymts': 'QTY (Mts)',
      'QTY (Mts)': 'QTY (Mts)',
      'price/mt': 'Price/Mt',
      'pricemt': 'Price/Mt',
      'Price/Mt': 'Price/Mt',
      'pt duty': 'PT DUTY',
      'ptduty': 'PT DUTY',
      'PT DUTY': 'PT DUTY',
      'pt stax': 'PT STAX',
      'ptstax': 'PT STAX',
      'PT STAX': 'PT STAX',
      'pts tax': 'PTSTAX',
      'PTSTAX': 'PTSTAX',
      'itaxat': 'ITAXAT',
      'ITAXAT': 'ITAXAT',
      'machine no.': 'Machine No.',
      'machineno': 'Machine No.',
      'Machine No.': 'Machine No.',
      'cash no': 'Cash No',
      'cashno': 'Cash No',
      'Cash No': 'Cash No',
      'cash date': 'Cash Date',
      'cashdate': 'Cash Date',
      'Cash Date': 'Cash Date',
      'month': 'Month',
      'Month': 'Month',
      'year': 'Year',
      'Year': 'Year',
      'be type': 'BE Type',
      'betype': 'BE Type',
      'BE Type': 'BE Type',
      'port': 'Port',
      'Port': 'Port',
      'port name': 'Port Name',
      'portname': 'Port Name',
      'Port Name': 'Port Name',
    };

    // Transform data to match database schema
    const transformedData = data.map((row: any) => {
      const transformedRow: any = {};
      Object.keys(row).forEach(csvField => {
        const normalizedField = csvField.toLowerCase().trim();
        const dbField = fieldMapping[normalizedField] || csvField;
        if (row[csvField] !== undefined && row[csvField] !== '') {
          transformedRow[dbField] = row[csvField];
        }
      });
      return transformedRow;
    });

    console.log('Transformed first row:', transformedData[0]);

    // Insert data into database
    const insertedData = await TradeData.insertMany(transformedData);

    return NextResponse.json({
      message: 'CSV data uploaded successfully',
      insertedCount: insertedData.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}