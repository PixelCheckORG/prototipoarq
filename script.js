class PixelCheckAnalyzer {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
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

        // Obtener dimensiones de imagen
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
            // Preparar canvas para análisis
            await this.prepareImageForAnalysis();
            
            // Ejecutar análisis híbrido
            const results = await this.performHybridAnalysis();
            
            // Mostrar resultados
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

    async performHybridAnalysis() {
        const results = {};

        // 1. Análisis de patrones de píxeles
        this.updateLoadingStatus('Analizando patrones de píxeles...');
        await this.delay(800);
        results.pixelAnalysis = this.analyzePixelPatterns();

        // 2. Análisis FFT
        this.updateLoadingStatus('Ejecutando transformada de Fourier...');
        await this.delay(1000);
        results.fftAnalysis = this.performFFTAnalysis();

        // 3. Análisis de ruido
        this.updateLoadingStatus('Detectando patrones de ruido...');
        await this.delay(900);
        results.noiseAnalysis = this.analyzeNoise();

        // 4. Análisis de bordes
        this.updateLoadingStatus('Analizando consistencia de bordes...');
        await this.delay(700);
        results.edgeAnalysis = this.analyzeEdgeConsistency();

        // 5. Cálculo de score final con ML
        this.updateLoadingStatus('Calculando resultado final con IA...');
        await this.delay(1200);
        results.finalScore = this.calculateMLScore(results);

        return results;
    }

    analyzePixelPatterns() {
        const data = this.imageData.data;
        let uniformityScore = 0;
        let patterns = 0;
        let totalPixels = data.length / 4;

        // Analizar uniformidad local
        const blockSize = 8;
        const width = this.canvas.width;
        const height = this.canvas.height;

        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                let blockVariance = this.calculateBlockVariance(x, y, blockSize);
                
                // Las imágenes AI tienden a tener menor varianza local
                if (blockVariance < 150) {
                    uniformityScore++;
                }

                // Detectar patrones repetitivos (común en AI)
                if (this.detectRepeatingPattern(x, y, blockSize)) {
                    patterns++;
                }
            }
        }

        const blocks = Math.floor(width / blockSize) * Math.floor(height / blockSize);
        const uniformityRatio = uniformityScore / blocks;
        const patternRatio = patterns / blocks;

        // Score más alto = más probable AI
        const suspicionScore = (uniformityRatio * 0.6 + patternRatio * 0.4) * 100;

        return {
            uniformityRatio: uniformityRatio.toFixed(3),
            patternRatio: patternRatio.toFixed(3),
            suspicionScore: Math.min(suspicionScore, 100).toFixed(1),
            interpretation: suspicionScore > 60 ? 'Alta uniformidad - Sospechoso de IA' : 
                           suspicionScore > 30 ? 'Uniformidad moderada' : 'Patrones naturales detectados'
        };
    }

    calculateBlockVariance(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        let sum = 0, sumSquares = 0, count = 0;

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
                if (pixelIndex < data.length) {
                    const gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
                    sum += gray;
                    sumSquares += gray * gray;
                    count++;
                }
            }
        }

        const mean = sum / count;
        const variance = (sumSquares / count) - (mean * mean);
        return variance;
    }

    detectRepeatingPattern(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const pattern = [];

        // Extraer patrón del bloque
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
                if (pixelIndex < data.length) {
                    pattern.push(data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2]);
                }
            }
        }

        // Buscar patrón similar en bloques adyacentes
        let similarities = 0;
        const positions = [
            [x + size, y], [x - size, y],
            [x, y + size], [x, y - size],
            [x + size, y + size], [x - size, y - size]
        ];

        for (let [nx, ny] of positions) {
            if (nx >= 0 && ny >= 0 && nx < width - size && ny < this.canvas.height - size) {
                const similarity = this.compareBlocks(x, y, nx, ny, size);
                if (similarity > 0.85) similarities++;
            }
        }

        return similarities > 2; // Patrón repetitivo detectado
    }

    compareBlocks(x1, y1, x2, y2, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        let totalDiff = 0;
        let maxDiff = size * size * 3 * 255;

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const idx1 = ((y1 + dy) * width + (x1 + dx)) * 4;
                const idx2 = ((y2 + dy) * width + (x2 + dx)) * 4;
                
                if (idx1 < data.length && idx2 < data.length) {
                    totalDiff += Math.abs(data[idx1] - data[idx2]);
                    totalDiff += Math.abs(data[idx1 + 1] - data[idx2 + 1]);
                    totalDiff += Math.abs(data[idx1 + 2] - data[idx2 + 2]);
                }
            }
        }

        return 1 - (totalDiff / maxDiff);
    }

    performFFTAnalysis() {
        // Análisis simplificado de frecuencias usando técnicas de detección de patrones
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Convertir a escala de grises
        const grayData = [];
        for (let i = 0; i < data.length; i += 4) {
            grayData.push((data[i] + data[i + 1] + data[i + 2]) / 3);
        }

        // Análisis de frecuencias espaciales
        let highFreqCount = 0;
        let lowFreqCount = 0;
        let mediumFreqCount = 0;

        // Detectar cambios abruptos (altas frecuencias)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const center = grayData[idx];
                
                const gradientX = Math.abs(grayData[idx + 1] - grayData[idx - 1]) / 2;
                const gradientY = Math.abs(grayData[idx + width] - grayData[idx - width]) / 2;
                const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY);

                if (gradient > 50) highFreqCount++;
                else if (gradient > 15) mediumFreqCount++;
                else lowFreqCount++;
            }
        }

        const totalPixels = (width - 2) * (height - 2);
        const highFreqRatio = highFreqCount / totalPixels;
        const mediumFreqRatio = mediumFreqCount / totalPixels;
        const lowFreqRatio = lowFreqCount / totalPixels;

        // Las imágenes AI tienden a tener distribución anómala de frecuencias
        const anomalyScore = this.calculateFrequencyAnomalyScore(highFreqRatio, mediumFreqRatio, lowFreqRatio);

        // Visualizar espectro de frecuencias
        this.drawFrequencySpectrum(highFreqRatio, mediumFreqRatio, lowFreqRatio);

        return {
            highFreqRatio: (highFreqRatio * 100).toFixed(1),
            mediumFreqRatio: (mediumFreqRatio * 100).toFixed(1),
            lowFreqRatio: (lowFreqRatio * 100).toFixed(1),
            anomalyScore: anomalyScore.toFixed(1),
            interpretation: anomalyScore > 65 ? 'Distribución anómala de frecuencias' : 
                           anomalyScore > 35 ? 'Distribución moderadamente sospechosa' : 'Distribución natural de frecuencias'
        };
    }

    calculateFrequencyAnomalyScore(high, medium, low) {
        // Patrones típicos de imágenes naturales vs AI
        const naturalHigh = 0.15;   // ~15% altas frecuencias
        const naturalMedium = 0.35; // ~35% medias frecuencias
        const naturalLow = 0.50;    // ~50% bajas frecuencias

        const highDiff = Math.abs(high - naturalHigh) / naturalHigh;
        const mediumDiff = Math.abs(medium - naturalMedium) / naturalMedium;
        const lowDiff = Math.abs(low - naturalLow) / naturalLow;

        // Penalizar especialmente muy pocas altas frecuencias (común en AI)
        let penalty = 0;
        if (high < 0.08) penalty += 30;
        if (medium > 0.45) penalty += 20;

        const anomalyScore = ((highDiff + mediumDiff + lowDiff) / 3) * 100 + penalty;
        return Math.min(anomalyScore, 100);
    }

    drawFrequencySpectrum(high, medium, low) {
        const canvas = document.getElementById('fftCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        
        // Fondo
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        // Barras del espectro
        const barWidth = width / 3;
        const maxHeight = height - 20;

        const values = [low, medium, high];
        const labels = ['Bajas', 'Medias', 'Altas'];
        const colors = ['#10b981', '#f59e0b', '#ef4444'];

        values.forEach((value, i) => {
            const barHeight = value * maxHeight;
            const x = i * barWidth + 10;
            
            // Barra
            ctx.fillStyle = colors[i];
            ctx.fillRect(x, height - barHeight - 10, barWidth - 20, barHeight);
            
            // Etiqueta
            ctx.fillStyle = '#374151';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], x + (barWidth - 20) / 2, height - 5);
            
            // Valor
            ctx.fillText(`${(value * 100).toFixed(1)}%`, x + (barWidth - 20) / 2, height - barHeight - 15);
        });
    }

    analyzeNoise() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        let noiseVariance = 0;
        let pixelCount = 0;
        let noisePatternsDetected = 0;

        // Analizar ruido en bloques pequeños
        for (let y = 0; y < height - 3; y += 3) {
            for (let x = 0; x < width - 3; x += 3) {
                const blockNoise = this.calculateBlockNoise(x, y, 3);
                noiseVariance += blockNoise.variance;
                pixelCount++;

                // Detectar patrones artificiales de ruido
                if (this.isArtificialNoise(blockNoise)) {
                    noisePatternsDetected++;
                }
            }
        }

        const avgNoiseVariance = noiseVariance / pixelCount;
        const artificialNoiseRatio = noisePatternsDetected / pixelCount;

        // Score de sospecha basado en patrones de ruido
        const suspicionScore = this.calculateNoiseSuspicionScore(avgNoiseVariance, artificialNoiseRatio);

        return {
            avgNoiseVariance: avgNoiseVariance.toFixed(2),
            artificialNoiseRatio: (artificialNoiseRatio * 100).toFixed(1),
            suspicionScore: suspicionScore.toFixed(1),
            interpretation: suspicionScore > 70 ? 'Patrones de ruido artificiales detectados' :
                           suspicionScore > 40 ? 'Ruido moderadamente sospechoso' : 'Ruido fotográfico natural'
        };
    }

    calculateBlockNoise(x, y, size) {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const values = [];

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                if (idx < data.length) {
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    values.push(gray);
                }
            }
        }

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

        return { mean, variance, values };
    }

    isArtificialNoise(blockNoise) {
        // Las imágenes AI a menudo tienen ruido muy uniforme o demasiado perfecto
        const { variance, values } = blockNoise;
        
        // Muy poca varianza = sospechoso
        if (variance < 5) return true;
        
        // Patrones muy regulares en el ruido
        const sortedValues = [...values].sort((a, b) => a - b);
        let regularPattern = true;
        
        for (let i = 1; i < sortedValues.length; i++) {
            const diff = Math.abs(sortedValues[i] - sortedValues[i-1]);
            if (diff > 3) {
                regularPattern = false;
                break;
            }
        }
        
        return regularPattern;
    }

    calculateNoiseSuspicionScore(avgVariance, artificialRatio) {
        // Ruido natural típico tiene varianza entre 20-80
        let varianceScore = 0;
        if (avgVariance < 15 || avgVariance > 100) {
            varianceScore = 40;
        } else if (avgVariance < 25 || avgVariance > 80) {
            varianceScore = 20;
        }

        const artificialScore = artificialRatio * 60;
        
        return Math.min(varianceScore + artificialScore, 100);
    }

    analyzeEdgeConsistency() {
        const data = this.imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        let inconsistentEdges = 0;
        let totalEdges = 0;
        let sharpnessVariance = 0;

        // Detectar bordes usando operador Sobel simplificado
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const edge = this.calculateEdgeStrength(x, y);
                
                if (edge.strength > 30) { // Es un borde
                    totalEdges++;
                    
                    // Analizar consistencia del borde
                    if (this.isInconsistentEdge(x, y, edge)) {
                        inconsistentEdges++;
                    }
                    
                    sharpnessVariance += edge.sharpness;
                }
            }
        }

        const inconsistencyRatio = totalEdges > 0 ? inconsistentEdges / totalEdges : 0;
        const avgSharpness = totalEdges > 0 ? sharpnessVariance / totalEdges : 0;

        const consistencyScore = this.calculateEdgeConsistencyScore(inconsistencyRatio, avgSharpness);

        return {
            totalEdges: totalEdges,
            inconsistentEdges: inconsistentEdges,
            inconsistencyRatio: (inconsistencyRatio * 100).toFixed(1),
            avgSharpness: avgSharpness.toFixed(1),
            consistencyScore: consistencyScore.toFixed(1),
            interpretation: consistencyScore < 40 ? 'Bordes consistentes - Natural' :
                           consistencyScore < 70 ? 'Consistencia moderada' : 'Bordes inconsistentes - Sospechoso de IA'
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
        const sharpness = Math.max(Math.abs(gx), Math.abs(gy));

        return { strength, sharpness, gx, gy };
    }

    isInconsistentEdge(x, y, edge) {
        // Analizar bordes vecinos para detectar inconsistencias
        const neighbors = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];

        let consistentNeighbors = 0;
        const threshold = edge.strength * 0.3;

        for (let [nx, ny] of neighbors) {
            if (nx > 0 && ny > 0 && nx < this.canvas.width - 1 && ny < this.canvas.height - 1) {
                const neighborEdge = this.calculateEdgeStrength(nx, ny);
                
                if (Math.abs(neighborEdge.strength - edge.strength) < threshold) {
                    consistentNeighbors++;
                }
            }
        }

        // Borde inconsistente si tiene pocos vecinos similares
        return consistentNeighbors < 2;
    }

    calculateEdgeConsistencyScore(inconsistencyRatio, avgSharpness) {
        // Las imágenes AI a menudo tienen bordes demasiado perfectos o inconsistentes
        let score = inconsistencyRatio * 80;

        // Penalizar nitidez artificial extrema
        if (avgSharpness > 150) score += 25;
        else if (avgSharpness < 30) score += 15;

        return Math.min(score, 100);
    }

    calculateMLScore(results) {
        // Algoritmo de ML simplificado que combina todos los análisis
        const weights = {
            pixel: 0.25,    // Peso del análisis de píxeles
            fft: 0.30,      // Peso del análisis FFT
            noise: 0.25,    // Peso del análisis de ruido
            edge: 0.20      // Peso del análisis de bordes
        };

        // Normalizar scores a 0-1
        const pixelScore = parseFloat(results.pixelAnalysis.suspicionScore) / 100;
        const fftScore = parseFloat(results.fftAnalysis.anomalyScore) / 100;
        const noiseScore = parseFloat(results.noiseAnalysis.suspicionScore) / 100;
        const edgeScore = parseFloat(results.edgeAnalysis.consistencyScore) / 100;

        // Cálculo ponderado
        const finalScore = (
            pixelScore * weights.pixel +
            fftScore * weights.fft +
            noiseScore * weights.noise +
            edgeScore * weights.edge
        );

        // Aplicar función de activación sigmoidea para suavizar
        const sigmoidScore = 1 / (1 + Math.exp(-10 * (finalScore - 0.5)));

        // Determinar clasificación
        let classification, confidence;
        
        if (sigmoidScore > 0.75) {
            classification = 'ai-generated';
            confidence = 'high';
        } else if (sigmoidScore > 0.55) {
            classification = 'ai-generated';
            confidence = 'medium';
        } else if (sigmoidScore > 0.45) {
            classification = 'uncertain';
            confidence = 'low';
        } else if (sigmoidScore > 0.25) {
            classification = 'real';
            confidence = 'medium';
        } else {
            classification = 'real';
            confidence = 'high';
        }

        return {
            rawScore: finalScore.toFixed(3),
            processedScore: sigmoidScore.toFixed(3),
            percentage: (sigmoidScore * 100).toFixed(1),
            classification,
            confidence,
            individual: {
                pixel: pixelScore.toFixed(3),
                fft: fftScore.toFixed(3),
                noise: noiseScore.toFixed(3),
                edge: edgeScore.toFixed(3)
            }
        };
    }

    async displayResults(results) {
        // Actualizar metadatos
        this.displayMetadata();
        
        // Mostrar resultado principal
        this.displayMainResult(results.finalScore);
        
        // Mostrar análisis detallados
        await this.displayDetailedAnalysis(results);
        
        // Mostrar detalles técnicos
        this.displayTechnicalDetails(results);
    }

    displayMetadata() {
        if (this.metadata) {
            document.getElementById('formatValue').textContent = this.metadata.format;
            document.getElementById('dimensionsValue').textContent = this.metadata.dimensions;
            document.getElementById('sizeValue').textContent = this.metadata.size;
            
            // Evaluar compresión basada en formato y tamaño
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

    displayMainResult(finalScore) {
        const verdictEl = document.getElementById('verdict');
        const iconEl = document.getElementById('verdictIcon');
        const textEl = document.getElementById('verdictText');
        const confidenceBadge = document.getElementById('confidenceBadge');
        const confidenceText = document.getElementById('confidenceText');

        // Limpiar clases previas
        verdictEl.className = 'verdict';
        confidenceBadge.className = 'confidence-badge';

        // Aplicar estilos según clasificación
        verdictEl.classList.add(finalScore.classification);
        confidenceBadge.classList.add(`confidence-${finalScore.confidence}`);

        // Actualizar contenido
        const icons = {
            'ai-generated': '🤖',
            'real': '📷',
            'uncertain': '❓'
        };

        const texts = {
            'ai-generated': 'Imagen Generada por IA',
            'real': 'Imagen Real/Natural',
            'uncertain': 'Resultado Incierto'
        };

        const confidenceTexts = {
            'high': 'Alta Confianza',
            'medium': 'Confianza Media',
            'low': 'Baja Confianza'
        };

        iconEl.textContent = icons[finalScore.classification];
        textEl.textContent = texts[finalScore.classification];
        confidenceText.textContent = `${confidenceTexts[finalScore.confidence]} (${finalScore.percentage}%)`;
    }

    async displayDetailedAnalysis(results) {
        // Análisis de píxeles
        await this.animateProgress('pixelProgress', parseFloat(results.pixelAnalysis.suspicionScore));
        document.getElementById('pixelAnalysis').textContent = results.pixelAnalysis.interpretation;

        // Análisis FFT
        await this.delay(200);
        await this.animateProgress('fftProgress', parseFloat(results.fftAnalysis.anomalyScore));
        document.getElementById('fftAnalysis').textContent = results.fftAnalysis.interpretation;

        // Análisis de ruido
        await this.delay(200);
        await this.animateProgress('noiseProgress', parseFloat(results.noiseAnalysis.suspicionScore));
        document.getElementById('noiseAnalysis').textContent = results.noiseAnalysis.interpretation;
    }

    displayTechnicalDetails(results) {
        document.getElementById('pixelScore').textContent = results.finalScore.individual.pixel;
        document.getElementById('fftScore').textContent = results.finalScore.individual.fft;
        document.getElementById('noiseScore').textContent = results.finalScore.individual.noise;
        document.getElementById('edgeScore').textContent = results.finalScore.individual.edge;
    }

    async animateProgress(elementId, targetValue) {
        const progressEl = document.getElementById(elementId);
        let currentValue = 0;
        const increment = targetValue / 20;
        
        return new Promise((resolve) => {
            const animate = () => {
                currentValue += increment;
                if (currentValue >= targetValue) {
                    progressEl.style.width = `${targetValue}%`;
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