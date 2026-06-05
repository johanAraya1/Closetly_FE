/**
 * Analytics Service
 * Servicio para tracking de eventos de usuario
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
}

class AnalyticsService {
  private eventHistory: AnalyticsEvent[] = [];
  private isEnabled: boolean = true;

  /**
   * Inicializar analytics (aquí se conectaría Amplitude/Mixpanel)
   */
  init() {
  }

  /**
   * Rastrear un evento
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);

    // Aquí se enviaría a Amplitude/Mixpanel
    // amplitude.track(eventName, properties);
  }

  /**
   * Identificar usuario
   */
  identify(userId: string, userProperties?: Record<string, any>) {
    if (!this.isEnabled) return;

    // amplitude.setUserId(userId);
    // amplitude.setUserProperties(userProperties);
  }

  /**
   * Eventos predefinidos
   */
  events = {
    // Autenticación
    userSignedUp: (method: string) => 
      this.track('User Signed Up', { method }),
    
    userLoggedIn: (method: string) => 
      this.track('User Logged In', { method }),
    
    userLoggedOut: () => 
      this.track('User Logged Out'),

    // Prendas
    garmentCreated: (category: string, hasAIAnalysis: boolean) => 
      this.track('Garment Created', { category, hasAIAnalysis }),
    
    garmentUpdated: (garmentId: string) => 
      this.track('Garment Updated', { garmentId }),
    
    garmentDeleted: (garmentId: string) => 
      this.track('Garment Deleted', { garmentId }),
    
    garmentViewed: (garmentId: string) => 
      this.track('Garment Viewed', { garmentId }),

    // Outfits
    outfitCreated: (garmentCount: number) => 
      this.track('Outfit Created', { garmentCount }),
    
    outfitFavorited: (outfitId: string, isFavorite: boolean) => 
      this.track('Outfit Favorited', { outfitId, isFavorite }),
    
    outfitShared: (outfitId: string) => 
      this.track('Outfit Shared', { outfitId }),

    // Colecciones
    collectionCreated: (isPublic: boolean) => 
      this.track('Collection Created', { isPublic }),
    
    outfitAddedToCollection: (collectionId: string, outfitId: string) => 
      this.track('Outfit Added to Collection', { collectionId, outfitId }),

    // IA
    aiAnalysisRequested: (imageSize: number) => 
      this.track('AI Analysis Requested', { imageSize }),
    
    aiAnalysisCompleted: (confidence: number, detectedCategory: string) => 
      this.track('AI Analysis Completed', { confidence, detectedCategory }),

    // Navegación
    screenViewed: (screenName: string) => 
      this.track('Screen Viewed', { screenName }),
    
    // Errores
    errorOccurred: (errorType: string, errorMessage: string) => 
      this.track('Error Occurred', { errorType, errorMessage }),
  };

  /**
   * Deshabilitar analytics (para testing o privacidad)
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Habilitar analytics
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Obtener todos los eventos (para debugging)
   */
  getEvents() {
    return this.eventHistory;
  }

  /**
   * Limpiar eventos
   */
  clear() {
    this.eventHistory = [];
  }
}

export const analytics = new AnalyticsService();
