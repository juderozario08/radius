package handler_test

import (
	"net/http"
	"net/http/httptest"
	"radius/internal/handler"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHandlers_RejectInvalidPathIDEvenWithBodyID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name    string
		method  string
		route   string
		target  string
		body    string
		handler gin.HandlerFunc
	}{
		{"terminate session", http.MethodDelete, "/sessions/:id", "/sessions/abc", `{"session_id":5}`, (&handler.SessionHandler{}).TerminateSession},
		{"terminate employee", http.MethodPost, "/employees/:id/terminate", "/employees/0/terminate", `{"employee_id":5}`, (&handler.EmployeeHandler{}).TerminateEmployee},
		{"update employee", http.MethodPut, "/employees/:id", "/employees/abc", `{"email":"test@example.com","store_id":1,"first_name":"Jane","last_name":"Doe","role":"SALES","phone":"555-5555","address":"123 Main","city":"Toronto","province":"Ontario","postal_code":"M5V 2H1","is_active":true,"is_terminated":false}`, (&handler.EmployeeHandler{}).UpdateEmployee},
		{"activate store", http.MethodPost, "/stores/:id/activate", "/stores/-1/activate", `{"store_id":5}`, (&handler.StoreHandler{}).ActivateStore},
		{"approve cycle count", http.MethodPost, "/cycle_counts/:id/approve", "/cycle_counts/abc/approve", `{"count_id":5}`, (&handler.CycleCountHandler{}).ApproveCycleCount},
		{"complete pick", http.MethodPost, "/online/:id/complete_pick", "/online/abc/complete_pick", `{"order_id":5}`, (&handler.OnlineOrderHandler{}).CompleteOrderPicking},
		{"update order item", http.MethodPut, "/online/:id/items/:item_id", "/online/5/items/abc", `{"order_id":5,"order_item_id":6}`, (&handler.OnlineOrderHandler{}).UpdateOnlineOrderItem},
		{"cancel transfer", http.MethodPost, "/transfers/:id/cancel", "/transfers/abc/cancel", `{"transfer_id":5}`, (&handler.TransferHandler{}).CancelTransfer},
		{"quick receive transfer", http.MethodPost, "/transfers/:id/quick_receive", "/transfers/abc/quick_receive", `{"transfer_id":5}`, (&handler.ReceivingHandler{}).QuickReceiveTransfer},
		{"product detail", http.MethodGet, "/products/:id", "/products/abc?id=5", "", (&handler.ProductHandler{}).GetProductByID},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			r.Handle(tt.method, tt.route, tt.handler)
			response := httptest.NewRecorder()
			r.ServeHTTP(response, httptest.NewRequest(tt.method, tt.target, strings.NewReader(tt.body)))
			if response.Code != http.StatusBadRequest {
				t.Fatalf("status %d, want %d: %s", response.Code, http.StatusBadRequest, response.Body.String())
			}
		})
	}
}
