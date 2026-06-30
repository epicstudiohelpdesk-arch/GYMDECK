use lopdf::{Document, Object, Stream, ObjectId};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use image::ImageOutputFormat;
use sha2::{Sha256, Digest};
use crate::errors::AppError;

pub struct PdfOptimizer;

impl PdfOptimizer {
    /// Compresses a PDF in-memory according to the requested optimization levels.
    pub fn optimize(data: &[u8]) -> Result<Vec<u8>, AppError> {
        // --- PHASE 1: Parse the PDF ---
        let mut doc = Document::load_mem(data)
            .map_err(|e| AppError::Database(format!("Failed to parse PDF: {}", e)))?;

        // Ensure we work with flattened, resolved structures
        doc.prune_objects();

        // --- PHASE 4: Metadata Optimization ---
        Self::strip_metadata(&mut doc);

        // --- PHASE 6-10: Image Optimization Pipeline ---
        Self::optimize_images(&mut doc)?;

        // --- PHASE 11: Duplicate Resource Detection & Deduplication ---
        Self::deduplicate_streams(&mut doc);

        // --- PHASE 12: Stream Optimization & Recompression ---
        doc.compress();

        // --- PHASE 14 & 19: Cross Reference Optimization & Reconstruction ---
        doc.reference_table.cross_reference_type = lopdf::xref::XrefType::CrossReferenceStream;

        doc.prune_objects();

        let mut output = Vec::new();
        doc.save_to(&mut output)
            .map_err(|e| AppError::Database(format!("Failed to reconstruct PDF: {}", e)))?;

        Ok(output)
    }

    /// Strips authoring info, XMP metadata and creator timestamps to optimize structure and protect privacy.
    fn strip_metadata(doc: &mut Document) {
        // 1. Clear document Info dictionary (Producer, Creator, timestamps)
        if let Ok(ref_id) = doc.trailer.get(b"Info") {
            if let Ok(info_id) = ref_id.as_reference() {
                doc.objects.remove(&info_id);
            }
        }
        doc.trailer.remove(b"Info");

        // 2. Clear Metadata field from Root catalog
        let mut catalog_id = None;
        for (id, obj) in &doc.objects {
            if let Ok(dict) = obj.as_dict() {
                if dict.get(b"Type").and_then(|o| o.as_name()).ok() == Some(b"Catalog") {
                    catalog_id = Some(*id);
                    break;
                }
            }
        }

        if let Some(cat_id) = catalog_id {
            if let Some(Object::Dictionary(ref mut dict)) = doc.objects.get_mut(&cat_id) {
                dict.remove(b"Metadata");
                dict.remove(b"PieceInfo");
            }
        }
    }

    /// Helper to decompress and extract image XObject contents into a DynamicImage.
    fn decode_image(stream: &Stream) -> Option<image::DynamicImage> {
        let dict = &stream.dict;
        let width = dict.get(b"Width").and_then(|o| o.as_i64()).ok()? as u32;
        let height = dict.get(b"Height").and_then(|o| o.as_i64()).ok()? as u32;
        
        let filter = match dict.get(b"Filter") {
            Ok(Object::Name(ref name)) => Some(name.as_slice()),
            Ok(Object::Array(ref arr)) => {
                if let Some(Object::Name(ref name)) = arr.first() {
                    Some(name.as_slice())
                } else {
                    None
                }
            }
            _ => None,
        };

        // If it's already a standard lossy compression (JPEG), load directly
        if filter == Some(b"DCTDecode".as_slice()) || filter == Some(b"JPXDecode".as_slice()) {
            if let Ok(img) = image::load_from_memory(&stream.content) {
                return Some(img);
            }
        }

        let is_flate = filter == Some(b"FlateDecode".as_slice());
        let is_none = filter.is_none();

        if is_flate || is_none {
            let decompressed = if is_flate {
                let mut decompressed = Vec::new();
                let mut decoder = flate2::read::ZlibDecoder::new(&stream.content[..]);
                if decoder.read_to_end(&mut decompressed).is_ok() {
                    decompressed
                } else {
                    return None;
                }
            } else {
                stream.content.clone()
            };

            let bits = dict.get(b"BitsPerComponent").and_then(|o| o.as_i64()).unwrap_or(8);
            if bits == 8 {
                let len = decompressed.len();
                
                // Color space heuristic by buffer length
                if len == (width * height * 3) as usize {
                    // RGB
                    if let Some(buf) = image::ImageBuffer::<image::Rgb<u8>, _>::from_raw(width, height, decompressed) {
                        return Some(image::DynamicImage::ImageRgb8(buf));
                    }
                } else if len == (width * height) as usize {
                    // Grayscale
                    if let Some(buf) = image::ImageBuffer::<image::Luma<u8>, _>::from_raw(width, height, decompressed) {
                        return Some(image::DynamicImage::ImageLuma8(buf));
                    }
                } else if len == (width * height * 4) as usize {
                    // CMYK - Skip CMYK images to preserve high-fidelity print colors (such as marksheets and certificate seals)
                    return None;
                }
            }
        }

        None
    }

    /// Traverses the document to downscale high-resolution photos and compress them as JPEG.
    fn optimize_images(doc: &mut Document) -> Result<(), AppError> {
        let mut updated_streams = HashMap::new();

        for (id, obj) in &doc.objects {
            if let Object::Stream(ref stream) = obj {
                let dict = &stream.dict;
                
                // Verify if stream is a raster image XObject
                let is_image = dict.get(b"Subtype").and_then(|o| o.as_name()).ok() == Some(b"Image");
                if is_image {
                    let filter = match dict.get(b"Filter") {
                        Ok(Object::Name(ref name)) => Some(name.as_slice()),
                        Ok(Object::Array(ref arr)) => {
                            if let Some(Object::Name(ref name)) = arr.first() {
                                Some(name.as_slice())
                            } else {
                                None
                            }
                        }
                        _ => None,
                    };

                    let is_jpeg = filter == Some(b"DCTDecode".as_slice()) || filter == Some(b"JPXDecode".as_slice());
                    let is_flate = filter == Some(b"FlateDecode".as_slice()) || filter.is_none();

                    // If it is FlateDecode (lossless drawing/logo), only optimize if it represents a large page scan.
                    // Small elements (both width and height <= 500, or either under 150px) like seals, signature stamps, and logos are skipped.
                    if is_flate {
                        let width = dict.get(b"Width").and_then(|o| o.as_i64()).unwrap_or(0);
                        let height = dict.get(b"Height").and_then(|o| o.as_i64()).unwrap_or(0);
                        if width <= 150 || height <= 150 || (width <= 500 && height <= 500) {
                            continue;
                        }
                    } else if !is_jpeg {
                        // Skip monochrome fax compressions, JBIG2, LZW, etc.
                        continue;
                    }

                    // Skip transparent soft-mask images to maintain exact transparency state
                    if dict.has(b"SMask") {
                        continue;
                    }

                    // Skip stencil masks and color masks
                    let is_mask = dict.get(b"ImageMask").and_then(|o| o.as_bool()).unwrap_or(false);
                    if is_mask || dict.has(b"Mask") {
                        continue;
                    }

                    if let Some(img) = Self::decode_image(stream) {
                        let width = img.width();
                        let height = img.height();

                        // Target Maximum resolution dimension for documents (1200px)
                        let max_target = 1200;
                        let needs_resize = width > max_target || height > max_target;

                        if needs_resize {
                            let scaled_img = img.resize(max_target, max_target, image::imageops::FilterType::Triangle);
                            
                            let mut compressed_bytes = Vec::new();
                            let is_gray = match scaled_img.color() {
                                image::ColorType::L8 | image::ColorType::La8 | image::ColorType::L16 | image::ColorType::La16 => true,
                                _ => false,
                            };
                            
                            if scaled_img.write_to(&mut Cursor::new(&mut compressed_bytes), ImageOutputFormat::Jpeg(70)).is_ok() {
                                if compressed_bytes.len() < stream.content.len() {
                                    let mut new_dict = dict.clone();
                                    new_dict.set(b"Filter".to_vec(), Object::Name(b"DCTDecode".to_vec()));
                                    new_dict.set(b"Width".to_vec(), Object::Integer(scaled_img.width() as i64));
                                    new_dict.set(b"Height".to_vec(), Object::Integer(scaled_img.height() as i64));
                                    new_dict.set(b"BitsPerComponent".to_vec(), Object::Integer(8));
                                    new_dict.set(b"Length".to_vec(), Object::Integer(compressed_bytes.len() as i64));
                                    new_dict.remove(b"DecodeParms");
                                    new_dict.remove(b"DP");
                                    new_dict.remove(b"Decode");
                                    
                                    let cs = if is_gray { &b"DeviceGray"[..] } else { &b"DeviceRGB"[..] };
                                    new_dict.set(b"ColorSpace".to_vec(), Object::Name(cs.to_vec()));

                                    let new_stream = Stream {
                                        dict: new_dict,
                                        content: compressed_bytes,
                                        allows_compression: true,
                                        start_position: None,
                                    };
                                    updated_streams.insert(*id, new_stream);
                                }
                            }
                        } else if is_flate {
                            // If it's a large page scan but doesn't need scaling, still convert Flate to JPEG to save space
                            let mut compressed_bytes = Vec::new();
                            let is_gray = match img.color() {
                                image::ColorType::L8 | image::ColorType::La8 | image::ColorType::L16 | image::ColorType::La16 => true,
                                _ => false,
                            };
                            
                            if img.write_to(&mut Cursor::new(&mut compressed_bytes), ImageOutputFormat::Jpeg(70)).is_ok() {
                                if compressed_bytes.len() < stream.content.len() {
                                    let mut new_dict = dict.clone();
                                    new_dict.set(b"Filter".to_vec(), Object::Name(b"DCTDecode".to_vec()));
                                    new_dict.set(b"BitsPerComponent".to_vec(), Object::Integer(8));
                                    new_dict.set(b"Length".to_vec(), Object::Integer(compressed_bytes.len() as i64));
                                    new_dict.remove(b"DecodeParms");
                                    new_dict.remove(b"DP");
                                    new_dict.remove(b"Decode");
                                    
                                    let cs = if is_gray { &b"DeviceGray"[..] } else { &b"DeviceRGB"[..] };
                                    new_dict.set(b"ColorSpace".to_vec(), Object::Name(cs.to_vec()));

                                    let new_stream = Stream {
                                        dict: new_dict,
                                        content: compressed_bytes,
                                        allows_compression: true,
                                        start_position: None,
                                    };
                                    updated_streams.insert(*id, new_stream);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Apply optimizations to document objects map
        for (id, stream) in updated_streams {
            doc.objects.insert(id, Object::Stream(stream));
        }

        Ok(())
    }

    /// Deduplicates identical streams (fonts, graphics patterns, duplicate images) to compress structure.
    fn deduplicate_streams(doc: &mut Document) {
        let mut hash_to_ids: HashMap<[u8; 32], Vec<ObjectId>> = HashMap::new();
        let mut replacements = HashMap::new();

        // 1. Group streams by content hash
        for (id, obj) in &doc.objects {
            if let Object::Stream(ref stream) = obj {
                let mut hasher = Sha256::new();
                hasher.update(&stream.content);
                let hash: [u8; 32] = hasher.finalize().into();
                
                hash_to_ids.entry(hash).or_default().push(*id);
            }
        }

        // 2. Find identical streams (content + dictionary) within each hash group
        for (_, ids) in hash_to_ids {
            if ids.len() < 2 {
                continue;
            }

            let mut unique_ids: Vec<ObjectId> = Vec::new();
            for id in ids {
                let mut found_duplicate = false;
                
                let current_stream = match doc.objects.get(&id) {
                    Some(Object::Stream(ref s)) => s,
                    _ => continue,
                };

                for &unique_id in &unique_ids {
                    let unique_stream = match doc.objects.get(&unique_id) {
                        Some(Object::Stream(ref s)) => s,
                        _ => continue,
                    };

                    // Only replace if both content and dictionary fields match exactly
                    if current_stream == unique_stream {
                        replacements.insert(id, unique_id);
                        found_duplicate = true;
                        break;
                    }
                }

                if !found_duplicate {
                    unique_ids.push(id);
                }
            }
        }

        if replacements.is_empty() {
            return;
        }

        // 3. Walk the full object graph and replace duplicate references
        let replace_refs = |obj: &mut Object| {
            if let Object::Reference(ref_id) = obj {
                if let Some(new_id) = replacements.get(ref_id) {
                    *ref_id = *new_id;
                }
            }
        };

        for (_, obj) in &mut doc.objects {
            match obj {
                Object::Array(ref mut array) => {
                    for item in array.iter_mut() {
                        replace_refs(item);
                    }
                }
                Object::Dictionary(ref mut dict) => {
                    for (_, val) in dict.iter_mut() {
                        replace_refs(val);
                    }
                }
                Object::Stream(ref mut stream) => {
                    for (_, val) in stream.dict.iter_mut() {
                        replace_refs(val);
                    }
                }
                _ => {}
            }
        }
    }
}
