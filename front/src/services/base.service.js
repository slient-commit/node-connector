class BaseService {
    constructor() {
        this.baseAPI = window.__API_BASE_URL__ || "http://localhost:3001";
    }
}

export default BaseService;