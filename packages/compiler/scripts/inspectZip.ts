/**
 * inspectZip - Minimal, dependency-free ZIP central-directory reader
 *
 * Used only by local test/debug scripts to print and assert on the file
 * tree of a generated .zip buffer, without adding a runtime dependency
 * to the published @cpi-ai/compiler package (archiver is write-only).
 *
 * Parses the End Of Central Directory (EOCD) record and walks the
 * Central Directory File Headers to recover the list of entry names.
 * This is sufficient to answer "what paths does this zip contain",
 * which is all local verification of package structure can check --
 * it says nothing about whether SAP Integration Suite will accept the
 * file, since that depends on server-side rules this repo has no way
 * to execute.
 */
export function listZipEntries(buffer: Buffer): string[] {
    const EOCD_SIG = 0x06054b50;
    const CDFH_SIG = 0x02014b50;

    // Find End Of Central Directory record by scanning backward
    // (it may be followed by a variable-length comment field).
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= 0; i--) {
        if (buffer.readUInt32LE(i) === EOCD_SIG) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) {
        throw new Error('Not a valid ZIP file: End Of Central Directory record not found');
    }

    const cdEntryCount = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    const entries: string[] = [];
    let offset = cdOffset;

    for (let i = 0; i < cdEntryCount; i++) {
        const sig = buffer.readUInt32LE(offset);
        if (sig !== CDFH_SIG) {
            throw new Error(`Corrupt ZIP: expected Central Directory File Header at offset ${offset}`);
        }

        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);

        const nameStart = offset + 46;
        const name = buffer.toString('utf-8', nameStart, nameStart + nameLength);
        entries.push(name);

        offset = nameStart + nameLength + extraLength + commentLength;
    }

    return entries;
}

/**
 * Reads and decompresses a single entry's content from a ZIP buffer by name.
 * Supports the two compression methods archiver actually produces:
 * 0 (stored) and 8 (deflate).
 */
export function readZipEntry(buffer: Buffer, entryName: string): Buffer {
    const LFH_SIG = 0x04034b50;
    const CDFH_SIG = 0x02014b50;
    const EOCD_SIG = 0x06054b50;

    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= 0; i--) {
        if (buffer.readUInt32LE(i) === EOCD_SIG) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) {
        throw new Error('Not a valid ZIP file: End Of Central Directory record not found');
    }

    const cdEntryCount = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    let offset = cdOffset;
    let localHeaderOffset = -1;
    let compressionMethod = -1;
    let compressedSize = -1;

    for (let i = 0; i < cdEntryCount; i++) {
        if (buffer.readUInt32LE(offset) !== CDFH_SIG) {
            throw new Error(`Corrupt ZIP: expected Central Directory File Header at offset ${offset}`);
        }
        const method = buffer.readUInt16LE(offset + 10);
        const compSize = buffer.readUInt32LE(offset + 20);
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const lho = buffer.readUInt32LE(offset + 42);

        const nameStart = offset + 46;
        const name = buffer.toString('utf-8', nameStart, nameStart + nameLength);

        if (name === entryName) {
            localHeaderOffset = lho;
            compressionMethod = method;
            compressedSize = compSize;
            break;
        }

        offset = nameStart + nameLength + extraLength + commentLength;
    }

    if (localHeaderOffset === -1) {
        throw new Error(`Entry not found in ZIP: ${entryName}`);
    }

    if (buffer.readUInt32LE(localHeaderOffset) !== LFH_SIG) {
        throw new Error(`Corrupt ZIP: expected Local File Header at offset ${localHeaderOffset}`);
    }
    const lfNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const lfExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lfNameLength + lfExtraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
        return Buffer.from(compressedData);
    }
    if (compressionMethod === 8) {
        return require('zlib').inflateRawSync(compressedData);
    }
    throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
}

/**
 * Prints a ZIP's entries as an indented tree to the console.
 */
export function printZipTree(buffer: Buffer, label: string = 'ZIP contents'): string[] {
    const entries = listZipEntries(buffer).sort();
    console.log(`\n${label} (${entries.length} entries):`);
    for (const entry of entries) {
        const depth = (entry.match(/\//g) || []).length - (entry.endsWith('/') ? 1 : 0);
        const isDir = entry.endsWith('/');
        const base = entry.replace(/\/$/, '').split('/').pop();
        console.log(`${'  '.repeat(Math.max(depth, 0))}${isDir ? '📁' : '📄'} ${base}`);
    }
    return entries;
}
