package handlers

import (
	"fmt"
	"net/http"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
)

type OpenRouterRequest struct {
	Model    string              `json:"model"`
	Messages []OpenRouterMessage `json:"messages"`
}

type OpenRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

// CallOpenRouter makes a request to OpenRouter Free Models Router
func CallOpenRouter(prompt string, systemPrompt string) (string, error) {
	apiKey := config.GetOpenRouterAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("OpenRouter API Key not configured")
	}

	reqBody := OpenRouterRequest{
		Model: "openrouter/free",
		Messages: []OpenRouterMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: prompt},
		},
	}

	resp, err := utils.HttpClient.R().
		SetHeader("Authorization", "Bearer "+apiKey).
		SetHeader("HTTP-Referer", "https://animepro.vercel.app"). // For OpenRouter rankings
		SetHeader("X-Title", "AnimePro").
		SetBody(reqBody).
		Post("https://openrouter.ai/api/v1/chat/completions")

	if err != nil {
		return "", err
	}

	if resp.StatusCode() != http.StatusOK {
		return "", fmt.Errorf("OpenRouter API error: %s", resp.String())
	}

	var orResp OpenRouterResponse
	if err := utils.Unmarshal(resp.Body(), &orResp); err != nil {
		return "", err
	}

	if orResp.Error.Message != "" {
		return "", fmt.Errorf("OpenRouter error: %s", orResp.Error.Message)
	}

	if len(orResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return orResp.Choices[0].Message.Content, nil
}

