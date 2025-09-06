class PixelCheckAnalyzer {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.initializeMLModel();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.previewSection = document.getElementById('previewSection');
        this.previewImage = document.getElementById('previewImage');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingStatus = document.getElementById('loadingStatus');
    }

    initializeMLModel() {
        // Modelo ML CORREGIDO con mejores pesos y lógica más conservadora
        this.mlModel = {
            // Pesos reajustados basándose en análisis de falsos positivos
            weights: {
                // Features: [colorDiversity, transparency, noiseLevel, edgeSharpness, patternRegularity, compressionArtifacts, aiTexture, aiFrequency, aiGradient, metadataReal]
                
                // REAL: Imágenes fotográficas reales - FUERTE peso en metadatos reales
                real: [0.6, -0.9, 0.8, -0.4, -1.2, 0.4, -0.9, -0.7, -0.8, 1.0],
                
                // AI: Patrones regulares MUY IMPORTANTES + metadatos artificiales
                ai: [-0.2, -0.3, -0.8, 0.3, 1.8, -0.4, 1.2, 1.0, 1.1, -0.8],
                
                // GRAPHIC: Transparencia + bordes perfectos + metadatos neutros
                graphic: [-0.9, 1.0, -1.0, 1.0, 0.6, -0.9, 0.2, 0.1, 0.3, 0.1]
            },
            biases: {
                real: 0.8,     // FUERTEMENTE favorece imágenes reales
                ai: -1.5,      // PENALIZA MUY FUERTEMENTE la clasificación de IA
                graphic: -0.3  // Moderadamente conservador con gráfico
            },
            
            softmax: (values) => {
                const max = Math.max(...values);
                const exps = values.map(v => Math.exp(v - max));
                const sum = exps.reduce((a, b) => a + b, 0);
                return exps.map(exp => exp / sum);
            }
        };
    }

    setupEventListeners() {
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.imageInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.analyzeBtn.addEventListener('click', this.analyzeImage.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.style.borderColor = '#3b82f6';
        this.uploadArea.style.backgroundColor = '#f0f9ff';
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.style.borderColor = '#e5e7eb';
        this.uploadArea.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.currentImageData = e.target.result;
            this.currentFile = file;
            this.showPreview();
            this.extractMetadata(file);
        };
        reader.readAsDataURL(file);
    }

    showPreview() {
        this.previewSection.style.display = 'grid';
        this.resultsSection.style.display = 'none';
    }

    extractMetadata(file) {
        const metadata = {
            format: file.type.split('/')[1].toUpperCase(),
            size: this.formatFileSize(file.size),
            lastModified: new Date(file.lastModified).toLocaleDateString()
        };

        // Establecer metadatos básicos inmediatamente
        this.metadata = metadata;
        this.currentFile = file;

        this.previewImage.onload = () => {
            metadata.dimensions = `${this.previewImage.naturalWidth}x${this.previewImage.naturalHeight}`;
            metadata.aspectRatio = (this.previewImage.naturalWidth / this.previewImage.naturalHeight).toFixed(2);
            this.metadata = metadata;
        };
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    async analyzeImage() {
        this.showLoading();
        this.resultsSection.style.display = 'block';
        
        try {
            await this.prepareImageForAnalysis();
            const results = await this.performAdvancedAnalysis();
            await this.displayResults(results);
        } catch (error) {
            console.error('Error en análisis:', error);
            this.showError('Error durante el análisis');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
        this.updateLoadingStatus('Preparando análisis...');
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    updateLoadingStatus(status) {
        this.loadingStatus.textContent = status;
    }

    async prepareImageForAnalysis() {
        return new Promise((resolve) => {
            this.canvas.width = this.previewImage.naturalWidth;
            this.canvas.height = this.previewImage.naturalHeight;
            this.ctx.drawImage(this.previewImage, 0, 0);
            this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            resolve();
        });
    }

    async performAdvancedAnalysis() {
        const results = {};

        try {
            this.updateLoadingStatus('Extrayendo características de color...');
            await this.delay(600);
            results.colorAnalysis = this.analyzeColorCharacteristics();

            this.updateLoadingStatus('Analizando transparencia...');
            await this.delay(400);
            results.transparencyAnalysis = this.analyzeTransparency();

            this.updateLoadingStatus('Evaluando ruido fotográfico...');
            await this.delay(800);
            results.noiseAnalysis = this.analyzeAdvancedNoise();

            this.updateLoadingStatus('Analizando nitidez y bordes...');
            await this.delay(700);
            results.edgeAnalysis = this.analyzeEdgeSharpness();

            this.updateLoadingStatus('Detectando patrones artificiales...');
            await this.delay(600);
            results.patternAnalysis = this.analyzePatternRegularity();

            this.updateLoadingStatus('Evaluando artefactos de compresión...');
            await this.delay(500);
            results.compressionAnalysis = this.analyzeCompressionArtifacts();

            this.updateLoadingStatus('Analizando texturas homogéneas...');
            await this.delay(600);
            results.textureAnalysis = this.analyzeTextureHomogeneity();

            this.updateLoadingStatus('Analizando frecuencias DCT...');
            await this.delay(700);
            results.frequencyAnalysis = this.analyzeFrequencyDomain();

            this.updateLoadingStatus('Evaluando gradientes artificiales...');
            await this.delay(500);
            results.gradientAnalysis = this.analyzeGradientArtificiality();

            this.updateLoadingStatus('Analizando metadatos de imagen...');
            await this.delay(400);
            results.metadataAnalysis = this.analyzeImageMetadata();

            this.updateLoadingStatus('Clasificando con modelo ML...');
            await this.delay(1000);
            results.mlClassification = this.performMLClassification(results);

            return results;
        } catch (error) {
            console.error('Error en análisis avanzado:', error);
            throw error;
        }
    }

    analyzeColorCharacteristics() {
        const data = this.imageData.data;
        const colorMap = new Map();
        const colorCounts = { r: [], g: [], b: [] };
        let totalPixels = 0;

        // Análisis de diversidad cromática más preciso
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a > 0) {
                totalPixels++;
                // Agrupación más fina para mejor detección
                const colorKey = `${Math.floor(r/4)},${Math.floor(g/4)},${Math.floor(b/4)}`;
                colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                
                colorCounts.r.push(r);
                colorCounts.g.push(g);
                colorCounts.b.push(b);
            }
        }

        const uniqueColors = colorMap.size;
        const colorDiversity = uniqueColors / totalPixels;

        // Score MÁS CONSERVADOR - no penalizar imágenes reales con buena calidad
        let diversityScore;
        if (uniqueColors < 20 && totalPixels > 500) {
            diversityScore = 0.1;  // Definitivamente gráfico
        } else if (uniqueColors < 200) {
            diversityScore = 0.3;  // Posible gráfico
        } else if (uniqueColors > 1000) {
            diversityScore = 0.9;  // FAVOR a imágenes con muchos colores (típico real)
        } else {
            diversityScore = Math.min(colorDiversity * 5000, 0.8);  // Más generoso
        }

        return {
            uniqueColors,
            totalPixels,
            colorDiversity: colorDiversity.toFixed(4),
            hasLimitedPalette: uniqueColors < 50 && totalPixels > 1000,
            diversityScore
        };
    }

    analyzeTransparency() {
        const data = this.imageData.data;
        let transparentPixels = 0;
        let partialTransparentPixels = 0;
        let totalPixels = data.length / 4;

        for (let i = 3; i < data.length; i += 4) {
            const alpha = data[i];
            if (alpha === 0) {
                transparentPixels++;
            } else if (alpha < 255) {
                partialTransparentPixels++;
            }
        }

        const transparencyRatio = transparentPixels / totalPixels;
        const partialTransparencyRatio = partialTransparentPixels / totalPixels;

        return {
            transparentPixels,
            totalPixels,
            transparencyRatio: transparencyRatio.toFixed(3),
            partialTransparencyRatio: partialTransparencyRatio.toFixed(3),
            hasSignificantTransparency: transparencyRatio > 0.1,
            transparencyScore: transparencyRatio
        };
    }

    analyzeAdvancedNoise() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        let noiseLevel = 0;
        let naturalNoisePatterns = 0;
        let artificialNoisePatterns = 0;
        let blockCount = 0;

        const blockSize = 6; // Bloques más grandes para mejor análisis

        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                const block = this.extractBlock(x, y, blockSize);
                const blockNoise = this.calculateBlockNoise(block);
                
                noiseLevel += blockNoise.level;
                
                if (this.isNaturalNoise(blockNoise)) {
                    naturalNoisePatterns++;
                }
                
                blockCount++;
            }
        }

        const avgNoiseLevel = noiseLevel / blockCount;
        const naturalNoiseRatio = naturalNoisePatterns / blockCount;

        // Score CORREGIDO - muchas imágenes reales modernas tienen poco ruido
        let noiseScore;
        if (avgNoiseLevel < 3) {
            // Poco ruido NO significa automáticamente IA
            // Podría ser foto real de buena calidad o bien procesada
            noiseScore = 0.3;  // NEUTRAL en lugar de penalizar
        } else if (avgNoiseLevel > 25) {
            noiseScore = 0.9;  // Definitivamente natural
        } else if (avgNoiseLevel > 12) {
            noiseScore = 0.7;  // Probablemente natural
        } else {
            noiseScore = 0.4;  // Neutral-natural
        }

        // Bonificación por ruido natural detectado
        if (naturalNoiseRatio > 0.1) {
            noiseScore = Math.min(noiseScore + 0.3, 1.0);
        }

        return {
            avgNoiseLevel: avgNoiseLevel.toFixed(2),
            naturalNoiseRatio: naturalNoiseRatio.toFixed(3),
            noiseScore,
            interpretation: avgNoiseLevel < 5 ? 'Imagen muy limpia (alta calidad o procesada)' :
                           avgNoiseLevel < 20 ? 'Ruido moderado' : 
                           'Ruido fotográfico natural'
        };
    }

    extractBlock(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const block = [];

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                if (idx < data.length) {
                    block.push({
                        r: data[idx],
                        g: data[idx + 1],
                        b: data[idx + 2],
                        a: data[idx + 3]
                    });
                }
            }
        }

        return block;
    }

    calculateBlockNoise(block) {
        if (block.length === 0) return { level: 0, variance: 0 };

        const grayValues = block.map(pixel => 
            (pixel.r + pixel.g + pixel.b) / 3
        );

        const mean = grayValues.reduce((a, b) => a + b, 0) / grayValues.length;
        const variance = grayValues.reduce((sum, val) => 
            sum + Math.pow(val - mean, 2), 0
        ) / grayValues.length;

        return {
            level: Math.sqrt(variance),
            variance,
            mean
        };
    }

    isNaturalNoise(blockNoise) {
        return blockNoise.level > 8 && blockNoise.level < 60 && blockNoise.variance > 50;
    }

    analyzeEdgeSharpness() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        let totalEdgeStrength = 0;
        let sharpEdges = 0;
        let moderateEdges = 0;
        let softEdges = 0;
        let edgeCount = 0;

        // Muestreo más disperso para mejor rendimiento
        for (let y = 2; y < height - 2; y += 3) {
            for (let x = 2; x < width - 2; x += 3) {
                const edge = this.calculateEdgeStrength(x, y);
                
                if (edge.strength > 8) {
                    totalEdgeStrength += edge.strength;
                    edgeCount++;
                    
                    if (edge.strength > 60) {
                        sharpEdges++;
                    } else if (edge.strength > 25) {
                        moderateEdges++;
                    } else {
                        softEdges++;
                    }
                }
            }
        }

        const avgEdgeStrength = edgeCount > 0 ? totalEdgeStrength / edgeCount : 0;
        const sharpnessRatio = edgeCount > 0 ? sharpEdges / edgeCount : 0;
        const moderateRatio = edgeCount > 0 ? moderateEdges / edgeCount : 0;
        
        // Score CORREGIDO - imágenes reales pueden tener bordes variables
        let sharpnessScore;
        if (sharpnessRatio > 0.6) {
            sharpnessScore = 0.9;  // Muy nítido = probablemente gráfico
        } else if (sharpnessRatio > 0.3) {
            sharpnessScore = 0.6;  // Bastante nítido
        } else if (moderateRatio > 0.4) {
            sharpnessScore = 0.4;  // Bordes moderados = FAVOR a real
        } else {
            sharpnessScore = 0.2;  // Bordes suaves = definitivamente real
        }

        return {
            avgEdgeStrength: avgEdgeStrength.toFixed(2),
            sharpnessRatio: sharpnessRatio.toFixed(3),
            sharpnessScore,
            interpretation: sharpnessRatio > 0.4 ? 'Bordes muy nítidos' :
                           sharpnessRatio > 0.15 ? 'Nitidez moderada' : 'Bordes suaves (fotográfico)'
        };
    }

    calculateEdgeStrength(x, y) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        
        const getGray = (px, py) => {
            const idx = (py * width + px) * 4;
            return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        };

        // Operador Sobel
        const gx = (-1 * getGray(x-1, y-1)) + (1 * getGray(x+1, y-1)) +
                   (-2 * getGray(x-1, y)) + (2 * getGray(x+1, y)) +
                   (-1 * getGray(x-1, y+1)) + (1 * getGray(x+1, y+1));

        const gy = (-1 * getGray(x-1, y-1)) + (-2 * getGray(x, y-1)) + (-1 * getGray(x+1, y-1)) +
                   (1 * getGray(x-1, y+1)) + (2 * getGray(x, y+1)) + (1 * getGray(x+1, y+1));

        const strength = Math.sqrt(gx * gx + gy * gy);
        return { strength, gx, gy };
    }

    analyzePatternRegularity() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let regularPatterns = 0;
        let totalPatterns = 0;
        let veryRegularPatterns = 0;
        const blockSize = 20; // Bloques más grandes

        // Muestreo más espaciado para mejor rendimiento
        for (let y = 0; y < height - blockSize * 2; y += blockSize * 2) {
            for (let x = 0; x < width - blockSize * 2; x += blockSize * 2) {
                const similarity = this.compareBlocksAdvanced(x, y, x + blockSize, y, blockSize);
                totalPatterns++;
                
                if (similarity > 0.85) {
                    regularPatterns++;
                }
                if (similarity > 0.95) {
                    veryRegularPatterns++;
                }
            }
        }

        const regularityScore = totalPatterns > 0 ? regularPatterns / totalPatterns : 0;
        const veryRegularScore = totalPatterns > 0 ? veryRegularPatterns / totalPatterns : 0;
        
        // Score CALIBRADO basado en datos observados: IA = 0.950, Real = 0.600-0.800
        let adjustedRegularityScore;
        if (veryRegularScore > 0.6) {
            // Extremadamente regular = IA casi seguro
            adjustedRegularityScore = 0.98;  
        } else if (veryRegularScore > 0.4) {
            // Muy regular = muy sospechoso de IA
            adjustedRegularityScore = 0.92;   
        } else if (veryRegularScore > 0.2) {
            // Bastante regular = posible IA
            adjustedRegularityScore = 0.85;   
        } else if (regularityScore > 0.5) {
            // Regular moderado = posible IA o procesamiento
            adjustedRegularityScore = 0.7;   
        } else if (regularityScore > 0.3) {
            // Algo regular = probablemente real procesada
            adjustedRegularityScore = 0.4;   
        } else if (regularityScore > 0.15) {
            // Poca regularidad = favor a real
            adjustedRegularityScore = 0.2;   
        } else {
            // Muy irregular = definitivamente natural
            adjustedRegularityScore = 0.05;   
        }

        return {
            regularPatterns,
            totalPatterns,
            veryRegularPatterns,
            regularityScore: adjustedRegularityScore.toFixed(3),
            interpretation: veryRegularScore > 0.3 ? 'Patrones extremadamente regulares (artificial)' :
                           regularityScore > 0.3 ? 'Algunos patrones regulares' : 'Patrones naturales'
        };
    }

    compareBlocksAdvanced(x1, y1, x2, y2, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        let totalDiff = 0;
        let pixelCount = 0;

        for (let dy = 0; dy < size; dy += 2) { // Muestreo más espaciado
            for (let dx = 0; dx < size; dx += 2) {
                const idx1 = ((y1 + dy) * width + (x1 + dx)) * 4;
                const idx2 = ((y2 + dy) * width + (x2 + dx)) * 4;
                
                if (idx1 < data.length && idx2 < data.length) {
                    const diff = Math.abs(data[idx1] - data[idx2]) +
                                Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
                                Math.abs(data[idx1 + 2] - data[idx2 + 2]);
                    totalDiff += diff;
                    pixelCount++;
                }
            }
        }

        const maxDiff = pixelCount * 3 * 255;
        return pixelCount > 0 ? 1 - (totalDiff / maxDiff) : 0;
    }

    analyzeCompressionArtifacts() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        let blockingArtifacts = 0;
        let totalBlocks = 0;
        const blockSize = 8;

        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                if (this.hasJPEGBlocking(x, y, blockSize)) {
                    blockingArtifacts++;
                }
                totalBlocks++;
            }
        }

        const artifactRatio = totalBlocks > 0 ? blockingArtifacts / totalBlocks : 0;

        return {
            blockingArtifacts,
            totalBlocks,
            artifactRatio: artifactRatio.toFixed(3),
            compressionScore: artifactRatio,
            interpretation: artifactRatio > 0.2 ? 'Artefactos de compresión evidentes' :
                           artifactRatio > 0.05 ? 'Algunos artefactos detectados' : 'Sin artefactos significativos'
        };
    }

    hasJPEGBlocking(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;

        let edgeDiscontinuities = 0;
        
        for (let dy = 0; dy < size; dy += 2) { // Muestreo más espaciado
            const idx1 = ((y + dy) * width + (x + size - 1)) * 4;
            const idx2 = ((y + dy) * width + (x + size)) * 4;
            
            if (idx2 < data.length) {
                const diff = Math.abs(data[idx1] - data[idx2]) +
                            Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
                            Math.abs(data[idx1 + 2] - data[idx2 + 2]);
                if (diff > 40) edgeDiscontinuities++;
            }
        }

        return edgeDiscontinuities > size * 0.4;
    }

    analyzeTextureHomogeneity() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let totalHomogeneity = 0;
        let extremelySmooth = 0;
        let blockCount = 0;
        const blockSize = 16;
        
        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                const homogeneity = this.calculateBlockHomogeneity(x, y, blockSize);
                totalHomogeneity += homogeneity.score;
                
                // Solo contar regiones EXTREMADAMENTE suaves
                if (homogeneity.score > 0.92 && homogeneity.variance < 50) {
                    extremelySmooth++;
                }
                
                blockCount++;
            }
        }
        
        const avgHomogeneity = totalHomogeneity / blockCount;
        const extremelySmoothRatio = extremelySmooth / blockCount;
        
        // Score MÁS ESTRICTO - solo penalizar homogeneidad EXTREMA
        const aiTextureScore = extremelySmoothRatio > 0.4 ? 
            Math.min(extremelySmoothRatio * 2, 1) : 
            Math.min(avgHomogeneity * extremelySmoothRatio * 3, 0.5);
        
        return {
            avgHomogeneity: avgHomogeneity.toFixed(3),
            extremelySmoothRatio: extremelySmoothRatio.toFixed(3),
            aiTextureScore,
            interpretation: extremelySmoothRatio > 0.3 ? 'Texturas extremadamente homogéneas (sospechoso IA)' :
                           extremelySmoothRatio > 0.1 ? 'Algunas texturas muy suaves' : 'Texturas naturales'
        };
    }

    calculateBlockHomogeneity(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const pixels = [];
        
        for (let dy = 0; dy < size; dy += 2) { // Muestreo más espaciado
            for (let dx = 0; dx < size; dx += 2) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                if (idx < data.length) {
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    pixels.push(gray);
                }
            }
        }
        
        if (pixels.length === 0) return { score: 0, variance: 0 };
        
        const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
        const variance = pixels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pixels.length;
        
        const homogeneityScore = 1 / (1 + variance / 2000);
        
        return { score: homogeneityScore, variance };
    }

    analyzeFrequencyDomain() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let highFreqEnergy = 0;
        let midFreqEnergy = 0;
        let lowFreqEnergy = 0;
        let blockCount = 0;
        const blockSize = 8;
        
        // Muestreo más espaciado
        for (let y = 0; y < height - blockSize; y += blockSize * 2) {
            for (let x = 0; x < width - blockSize; x += blockSize * 2) {
                const block = this.extractGrayBlock(x, y, blockSize);
                const dctCoeffs = this.simpleDCT(block);
                const energies = this.categorizeFrequencyEnergy(dctCoeffs);
                
                highFreqEnergy += energies.high;
                midFreqEnergy += energies.mid;
                lowFreqEnergy += energies.low;
                blockCount++;
            }
        }
        
        const totalEnergy = highFreqEnergy + midFreqEnergy + lowFreqEnergy;
        if (totalEnergy === 0) return { aiFrequencyScore: 0.5 };
        
        const highFreqRatio = highFreqEnergy / totalEnergy;
        const lowFreqRatio = lowFreqEnergy / totalEnergy;
        
        // Score CORREGIDO - muchas fotos reales también tienen pocas altas frecuencias
        // Solo penalizar cuando es EXTREMADAMENTE bajo
        let aiFrequencyScore;
        if (highFreqRatio < 0.05 && lowFreqRatio > 0.8) {
            aiFrequencyScore = 0.9;  // Extremadamente artificial
        } else if (highFreqRatio < 0.1 && lowFreqRatio > 0.7) {
            aiFrequencyScore = 0.7;  // Sospechoso
        } else if (highFreqRatio < 0.2) {
            aiFrequencyScore = 0.4;  // Neutral - podría ser real procesada
        } else {
            aiFrequencyScore = 0.2;  // Favor a natural
        }
        
        return {
            highFreqRatio: highFreqRatio.toFixed(3),
            lowFreqRatio: lowFreqRatio.toFixed(3),
            aiFrequencyScore,
            interpretation: highFreqRatio < 0.08 ? 'Muy pocas altas frecuencias (sospechoso)' :
                           highFreqRatio < 0.2 ? 'Frecuencias moderadas' : 'Ricas altas frecuencias (natural)'
        };
    }

    extractGrayBlock(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const block = [];
        
        for (let dy = 0; dy < size; dy++) {
            const row = [];
            for (let dx = 0; dx < size; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                if (idx < data.length) {
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    row.push(gray);
                } else {
                    row.push(0);
                }
            }
            block.push(row);
        }
        
        return block;
    }

    simpleDCT(block) {
        const size = block.length;
        const dct = [];
        
        // DCT 2D simplificada - solo calcular algunos coeficientes clave
        for (let u = 0; u < Math.min(size, 4); u++) {
            const row = [];
            for (let v = 0; v < Math.min(size, 4); v++) {
                let sum = 0;
                for (let x = 0; x < size; x += 2) { // Muestreo más espaciado
                    for (let y = 0; y < size; y += 2) {
                        sum += block[x][y] * 
                               Math.cos((2 * x + 1) * u * Math.PI / (2 * size)) *
                               Math.cos((2 * y + 1) * v * Math.PI / (2 * size));
                    }
                }
                row.push(sum);
            }
            dct.push(row);
        }
        
        return dct;
    }

    categorizeFrequencyEnergy(dctCoeffs) {
        const size = dctCoeffs.length;
        let highEnergy = 0;
        let midEnergy = 0;
        let lowEnergy = 0;
        
        for (let u = 0; u < size; u++) {
            for (let v = 0; v < size; v++) {
                const energy = Math.abs(dctCoeffs[u][v]);
                const freq = u + v;
                
                if (freq <= 1) {
                    lowEnergy += energy;
                } else if (freq <= 3) {
                    midEnergy += energy;
                } else {
                    highEnergy += energy;
                }
            }
        }
        
        return { high: highEnergy, mid: midEnergy, low: lowEnergy };
    }

    analyzeGradientArtificiality() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let artificialGradients = 0;
        let totalGradients = 0;
        let perfectTransitions = 0;
        const sampleSize = Math.min(width, height) / 15;
        
        // Muestreo más espaciado
        for (let y = sampleSize; y < height - sampleSize; y += sampleSize * 2) {
            for (let x = sampleSize; x < width - sampleSize; x += sampleSize * 2) {
                const hGrad = this.analyzeLocalGradient(x, y, sampleSize, 'horizontal');
                const vGrad = this.analyzeLocalGradient(x, y, sampleSize, 'vertical');
                
                if (hGrad.isGradient || vGrad.isGradient) {
                    totalGradients++;
                    
                    // UMBRALES MÁS ESTRICTOS - solo contar gradientes EXTREMADAMENTE perfectos
                    if (hGrad.smoothness > 0.96 || vGrad.smoothness > 0.96) {
                        artificialGradients++;
                    }
                    
                    if (hGrad.smoothness > 0.98 || vGrad.smoothness > 0.98) {
                        perfectTransitions++;
                    }
                }
            }
        }
        
        const artificialGradientRatio = totalGradients > 0 ? artificialGradients / totalGradients : 0;
        const perfectTransitionRatio = totalGradients > 0 ? perfectTransitions / totalGradients : 0;
        
        // Score MÁS CONSERVADOR
        let gradientAiScore;
        if (perfectTransitionRatio > 0.4) {
            gradientAiScore = 0.9;  // Extremadamente sospechoso
        } else if (artificialGradientRatio > 0.5) {
            gradientAiScore = 0.7;  // Sospechoso
        } else if (artificialGradientRatio > 0.2) {
            gradientAiScore = 0.4;  // Neutral
        } else {
            gradientAiScore = 0.1;  // Natural
        }
        
        return {
            artificialGradientRatio: artificialGradientRatio.toFixed(3),
            perfectTransitionRatio: perfectTransitionRatio.toFixed(3),
            gradientAiScore,
            interpretation: perfectTransitionRatio > 0.4 ? 'Gradientes demasiado perfectos (muy sospechoso)' :
                           artificialGradientRatio > 0.4 ? 'Muchos gradientes artificiales' : 'Gradientes naturales'
        };
    }

    analyzeLocalGradient(x, y, size, direction) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const values = [];
        
        const step = Math.max(1, Math.floor(size / 10)); // Muestreo adaptativo
        
        if (direction === 'horizontal') {
            for (let dx = -size; dx <= size; dx += step) {
                const idx = (y * width + (x + dx)) * 4;
                if (idx >= 0 && idx < data.length) {
                    values.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
                }
            }
        } else {
            for (let dy = -size; dy <= size; dy += step) {
                const idx = ((y + dy) * width + x) * 4;
                if (idx >= 0 && idx < data.length) {
                    values.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
                }
            }
        }
        
        if (values.length < 3) return { isGradient: false, smoothness: 0 };
        
        const diffs = [];
        for (let i = 1; i < values.length; i++) {
            diffs.push(Math.abs(values[i] - values[i-1]));
        }
        
        const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const maxDiff = Math.max(...diffs);
        
        const isGradient = avgDiff > 3 && maxDiff > 10;
        
        const diffVariance = diffs.reduce((sum, diff) => 
            sum + Math.pow(diff - avgDiff, 2), 0) / diffs.length;
        const smoothness = avgDiff > 0 ? 1 / (1 + Math.sqrt(diffVariance) / avgDiff) : 0;
        
        return { isGradient, smoothness };
    }

    analyzeImageMetadata() {
        // Análisis de metadatos para detectar características de cámaras reales
        const format = this.metadata?.format || 'UNKNOWN';
        const fileSize = this.currentFile?.size || 0;
        const dimensions = this.metadata?.dimensions || '0x0';
        
        // Validación básica
        if (!this.metadata || !this.currentFile) {
            return {
                format: 'UNKNOWN',
                dimensions: '0x0',
                fileSize: 0,
                bytesPerPixel: '0.000',
                isPerfectSquare: false,
                isPerfectRatio: false,
                realCameraScore: '0.000',
                artificialScore: '0.000',
                metadataRealScore: 0.5,
                interpretation: 'Metadatos no disponibles'
            };
        }
        
        let realCameraScore = 0;
        let artificialScore = 0;
        
        // Análisis de formato
        if (format === 'JPEG') {
            realCameraScore += 0.3; // Las cámaras reales suelen usar JPEG
        } else if (format === 'PNG') {
            artificialScore += 0.2;  // IA suele generar PNG
        }
        
        // Análisis de dimensiones (IA tiende a usar dimensiones "perfectas")
        let width = 0, height = 0;
        try {
            const dims = dimensions.split('x');
            if (dims.length === 2) {
                width = parseInt(dims[0]) || 0;
                height = parseInt(dims[1]) || 0;
            }
        } catch (e) {
            console.warn('Error parsing dimensions:', dimensions);
        }
        
        const isPerfectSquare = width === height && (width % 512 === 0 || width % 1024 === 0);
        const isPerfectRatio = (width % 512 === 0 && height % 512 === 0);
        
        if (isPerfectSquare) {
            artificialScore += 0.4; // 1024x1024, 512x512, etc. son típicos de IA
        } else if (isPerfectRatio) {
            artificialScore += 0.2; // Dimensiones múltiplos de 512
        } else {
            realCameraScore += 0.2; // Dimensiones "raras" son más naturales
        }
        
        // Análisis de tamaño de archivo vs resolución
        const pixels = width * height;
        const bytesPerPixel = pixels > 0 ? fileSize / pixels : 0;
        
        if (format === 'JPEG') {
            if (bytesPerPixel > 2) {
                realCameraScore += 0.3; // JPEG con mucha información = probable cámara
            } else if (bytesPerPixel < 0.5) {
                artificialScore += 0.2; // JPEG muy comprimido = posible IA
            }
        } else if (format === 'PNG') {
            if (bytesPerPixel > 3) {
                realCameraScore += 0.2; // PNG grande = posible foto real convertida
            }
        }
        
        // Score final normalizado
        const totalScore = realCameraScore + artificialScore;
        const metadataRealScore = totalScore > 0 ? realCameraScore / totalScore : 0.5;
        
        return {
            format,
            dimensions,
            fileSize,
            bytesPerPixel: bytesPerPixel.toFixed(3),
            isPerfectSquare,
            isPerfectRatio,
            realCameraScore: realCameraScore.toFixed(3),
            artificialScore: artificialScore.toFixed(3),
            metadataRealScore,
            interpretation: metadataRealScore > 0.6 ? 'Metadatos sugieren cámara real' :
                           metadataRealScore < 0.4 ? 'Metadatos sugieren generación artificial' : 
                           'Metadatos neutros'
        };
    }

    performMLClassification(analysisResults) {
        const features = [
            parseFloat(analysisResults.colorAnalysis.diversityScore),      // 0: Diversidad de color
            parseFloat(analysisResults.transparencyAnalysis.transparencyScore), // 1: Transparencia
            parseFloat(analysisResults.noiseAnalysis.noiseScore),          // 2: Nivel de ruido
            parseFloat(analysisResults.edgeAnalysis.sharpnessScore),       // 3: Nitidez de bordes
            parseFloat(analysisResults.patternAnalysis.regularityScore),   // 4: Regularidad de patrones
            parseFloat(analysisResults.compressionAnalysis.compressionScore), // 5: Artefactos de compresión
            parseFloat(analysisResults.textureAnalysis.aiTextureScore),    // 6: Texturas homogéneas (IA)
            parseFloat(analysisResults.frequencyAnalysis.aiFrequencyScore), // 7: Análisis de frecuencia
            parseFloat(analysisResults.gradientAnalysis.gradientAiScore),  // 8: Gradientes artificiales
            parseFloat(analysisResults.metadataAnalysis.metadataRealScore) // 9: Metadatos de cámara real
        ];

        // Calcular scores para cada clase
        const scores = {};
        Object.keys(this.mlModel.weights).forEach(className => {
            const weights = this.mlModel.weights[className];
            const bias = this.mlModel.biases[className];
            
            scores[className] = features.reduce((sum, feature, i) => 
                sum + (feature * weights[i]), 0) + bias;
        });

        const scoreValues = Object.values(scores);
        const probabilities = this.mlModel.softmax(scoreValues);
        const classNames = Object.keys(scores);

        const classProbs = {};
        classNames.forEach((name, i) => {
            classProbs[name] = probabilities[i];
        });

        const maxProb = Math.max(...probabilities);
        const maxIndex = probabilities.indexOf(maxProb);
        let finalClassification = classNames[maxIndex];

        // SISTEMA DE REGLAS MÁS CONSERVADOR Y ESPECÍFICO
        let adjustedClassification = finalClassification;
        let adjustedConfidence = 'low';
        
        // REGLA ESPECÍFICA BASADA EN LOS DATOS OBSERVADOS
        // IA tiene un patrón MUY específico: Patrones ≥ 0.95 + Bordes suaves ≤ 0.2
        const specificAiSignature = 
            features[4] >= 0.93 &&  // Patrones EXTREMADAMENTE regulares (0.950 observado)
            features[3] <= 0.25;    // Bordes suaves (0.200 observado)
            
        // Indicadores adicionales que refuerzan la detección
        const supportingAiIndicators = [
            features[6] > 0.6,   // Texturas homogéneas
            features[2] <= 0.4,  // Poco ruido relativo
            features[8] > 0.7,   // Gradientes perfectos
            features[7] > 0.6,   // Frecuencias artificiales
            features[9] < 0.4    // Metadatos sugieren artificial (PNG, dimensiones perfectas)
        ];
        const supportingCount = supportingAiIndicators.filter(Boolean).length;
        
        // Si tiene la firma específica de IA + al menos 2 indicadores de apoyo
        if (specificAiSignature && supportingCount >= 2) {
            adjustedClassification = 'ai';
            adjustedConfidence = supportingCount >= 3 ? 'high' : 'medium';
        }
        
        // Patrón alternativo: Múltiples indicadores extremos sin la firma específica
        const extremeAiIndicators = [
            features[4] > 0.9,   // Patrones muy regulares
            features[6] > 0.8,   // Texturas muy homogéneas
            features[8] > 0.85,  // Gradientes perfectos
            features[7] > 0.8    // Frecuencias muy artificiales
        ];
        const extremeCount = extremeAiIndicators.filter(Boolean).length;
        
        if (extremeCount >= 3) {
            adjustedClassification = 'ai';
            adjustedConfidence = extremeCount === 4 ? 'high' : 'medium';
        }
        
        // Regla 2: Detectores específicos de imagen REAL
        const strongRealIndicators = [
            features[2] > 0.6,  // Ruido fotográfico natural
            features[3] < 0.3,  // Bordes suaves y naturales
            features[4] < 0.7,  // Patrones menos regulares que IA
            features[6] < 0.4,  // Texturas naturales
            features[9] > 0.6   // Metadatos sugieren cámara real (JPEG, dimensiones naturales)
        ];
        const strongRealCount = strongRealIndicators.filter(Boolean).length;
        
        // Regla 2.1: Patrón específico de foto real con metadatos
        const realCameraPattern = 
            features[9] > 0.7 &&    // Metadatos claramente de cámara
            features[4] < 0.85 &&   // Patrones menos regulares que IA
            features[1] === 0;      // Sin transparencia (típico de foto)
            
        if (realCameraPattern) {
            adjustedClassification = 'real';
            adjustedConfidence = 'high';
        }
        
        // Si hay evidencia fuerte de imagen real, anular otras clasificaciones
        if (strongRealCount >= 3) {
            adjustedClassification = 'real';
            adjustedConfidence = strongRealCount >= 4 ? 'high' : 'medium';
        }
        
        // Regla 3: Detectar diseño gráfico
        const graphicIndicators = [
            features[1] > 0.3,  // Transparencia significativa
            features[3] > 0.7,  // Bordes muy nítidos
            features[0] < 0.3,  // Pocos colores
            features[2] < 0.2   // Sin ruido
        ];
        const graphicCount = graphicIndicators.filter(Boolean).length;
        
        if (graphicCount >= 3) {
            adjustedClassification = 'graphic';
            adjustedConfidence = 'high';
        }
        
        // Regla 4: Anti-falsos positivos de IA
        // Si NO hay suficientes indicadores de IA, defaultear a REAL
        const totalAiIndicators = supportingCount + extremeCount;
        if (adjustedClassification === 'ai' && totalAiIndicators < 3) {
            adjustedClassification = 'real';
            adjustedConfidence = 'medium';
        }
        
        // Regla 5: Patrón específico observado - imágenes reales con poca regularidad
        if (features[4] < 0.5 && features[6] < 0.5 && features[0] > 0.4) {
            adjustedClassification = 'real';
            adjustedConfidence = 'medium';
        }
        
        // Regla 6: Si la confianza ML es muy baja, defaultear a real
        if (maxProb < 0.6) {
            adjustedClassification = 'real';
            adjustedConfidence = 'low';
        }

        // Mapear nombres de clase
        const classMapping = {
            'real': 'real',
            'ai': 'ai-generated',
            'graphic': 'graphic-design'
        };

        return {
            classification: classMapping[adjustedClassification],
            confidence: adjustedConfidence,
            probability: maxProb.toFixed(3),
            allProbabilities: {
                real: classProbs.real?.toFixed(3) || '0.000',
                aiGenerated: classProbs.ai?.toFixed(3) || '0.000',
                graphicDesign: classProbs.graphic?.toFixed(3) || '0.000'
            },
            features,
            rawScores: scores,
            debugInfo: {
                supportingCount,
                extremeCount,
                totalAiIndicators,
                strongRealCount,
                graphicCount,
                originalClassification: classMapping[finalClassification]
            }
        };
    }

    async displayResults(results) {
        this.displayMetadata();
        this.displayMainResult(results.mlClassification);
        await this.displayDetailedAnalysis(results);
        this.displayTechnicalDetails(results);
    }

    displayMetadata() {
        if (this.metadata) {
            document.getElementById('formatValue').textContent = this.metadata.format;
            document.getElementById('dimensionsValue').textContent = this.metadata.dimensions;
            document.getElementById('sizeValue').textContent = this.metadata.size;
            
            const compression = this.evaluateCompression();
            document.getElementById('compressionValue').textContent = compression;
        }
    }

    evaluateCompression() {
        const { format, size } = this.metadata;
        const dimensions = this.metadata.dimensions.split('x');
        const pixels = parseInt(dimensions[0]) * parseInt(dimensions[1]);
        const sizeBytes = parseInt(this.metadata.size.replace(/[^\d]/g, ''));
        
        const bytesPerPixel = sizeBytes / pixels;
        
        if (format === 'JPEG' && bytesPerPixel < 0.5) return 'Alta';
        if (format === 'PNG' && bytesPerPixel < 2) return 'Media';
        return 'Baja';
    }

    displayMainResult(mlResult) {
        const verdictEl = document.getElementById('verdict');
        const iconEl = document.getElementById('verdictIcon');
        const textEl = document.getElementById('verdictText');
        const confidenceBadge = document.getElementById('confidenceBadge');
        const confidenceText = document.getElementById('confidenceText');

        verdictEl.className = 'verdict';
        confidenceBadge.className = 'confidence-badge';

        verdictEl.classList.add(mlResult.classification);
        confidenceBadge.classList.add(`confidence-${mlResult.confidence}`);

        const icons = {
            'ai-generated': '🤖',
            'real': '📷',
            'uncertain': '❓',
            'graphic-design': '🎨'
        };

        const texts = {
            'ai-generated': 'Imagen Generada por IA',
            'real': 'Imagen Real/Fotográfica',
            'uncertain': 'Resultado Incierto',
            'graphic-design': 'Diseño Gráfico/Digital'
        };

        const confidenceTexts = {
            'high': 'Alta Confianza',
            'medium': 'Confianza Media',
            'low': 'Baja Confianza'
        };

        iconEl.textContent = icons[mlResult.classification];
        textEl.textContent = texts[mlResult.classification];
        confidenceText.textContent = `${confidenceTexts[mlResult.confidence]} (${(parseFloat(mlResult.probability) * 100).toFixed(1)}%)`;
    }

    async displayDetailedAnalysis(results) {
        await this.animateProgress('colorProgress', parseFloat(results.colorAnalysis.diversityScore) * 100);
        document.getElementById('colorAnalysis').textContent = 
            `${results.colorAnalysis.uniqueColors} colores únicos. ${results.colorAnalysis.hasLimitedPalette ? 'Paleta limitada detectada.' : 'Rica diversidad cromática.'}`;

        await this.delay(200);

        await this.animateProgress('transparencyProgress', parseFloat(results.transparencyAnalysis.transparencyRatio) * 100);
        document.getElementById('transparencyAnalysis').textContent = 
            `${(parseFloat(results.transparencyAnalysis.transparencyRatio) * 100).toFixed(1)}% píxeles transparentes. ${results.transparencyAnalysis.hasSignificantTransparency ? 'Transparencia significativa.' : 'Imagen opaca.'}`;

        await this.delay(200);

        await this.animateProgress('noiseProgress', parseFloat(results.noiseAnalysis.noiseScore) * 100);
        document.getElementById('noiseAnalysis').textContent = results.noiseAnalysis.interpretation;
    }

    displayTechnicalDetails(results) {
        const ml = results.mlClassification;
        
        document.getElementById('realProb').textContent = `${(parseFloat(ml.allProbabilities.real) * 100).toFixed(1)}%`;
        document.getElementById('aiProb').textContent = `${(parseFloat(ml.allProbabilities.aiGenerated) * 100).toFixed(1)}%`;
        document.getElementById('graphicProb').textContent = `${(parseFloat(ml.allProbabilities.graphicDesign) * 100).toFixed(1)}%`;
        
        document.getElementById('colorFeature').textContent = ml.features[0].toFixed(3);
        document.getElementById('transparencyFeature').textContent = ml.features[1].toFixed(3);
        document.getElementById('noiseFeature').textContent = ml.features[2].toFixed(3);
        document.getElementById('sharpnessFeature').textContent = ml.features[3].toFixed(3);
        document.getElementById('patternFeature').textContent = ml.features[4].toFixed(3);
        document.getElementById('compressionFeature').textContent = ml.features[5].toFixed(3);
        
        if (document.getElementById('textureFeature')) {
            document.getElementById('textureFeature').textContent = ml.features[6].toFixed(3);
        }
        if (document.getElementById('frequencyFeature')) {
            document.getElementById('frequencyFeature').textContent = ml.features[7].toFixed(3);
        }
        if (document.getElementById('gradientFeature')) {
            document.getElementById('gradientFeature').textContent = ml.features[8].toFixed(3);
        }
    }

    async animateProgress(elementId, targetValue) {
        const progressEl = document.getElementById(elementId);
        if (!progressEl) return;
        
        let currentValue = 0;
        const increment = targetValue / 20;
        
        return new Promise((resolve) => {
            const animate = () => {
                currentValue += increment;
                if (currentValue >= targetValue) {
                    progressEl.style.width = `${Math.min(targetValue, 100)}%`;
                    resolve();
                } else {
                    progressEl.style.width = `${currentValue}%`;
                    setTimeout(animate, 50);
                }
            };
            animate();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showError(message) {
        alert(`Error: ${message}`);
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new PixelCheckAnalyzer();
});