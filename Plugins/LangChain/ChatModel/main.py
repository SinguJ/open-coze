import json
from runtime import Args
from typing import Optional, Any, List, Dict
from typings.ChatModel.ChatModel import Input, Output, KwargsItems, MessagesItems

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


prompt_template = ChatPromptTemplate.from_messages([
    MessagesPlaceholder(variable_name='messages'),
])


def parse_kwargs(kwargs: List[KwargsItems] | None) -> Dict[str, Any]:
    if not kwargs:
        return {}

    _kwargs = {}
    for kwarg in kwargs:
        value = kwarg.value
        _type = kwarg.type
        if _type is not None:
            value = {
                '': lambda s: s,
                'str': lambda s: s,
                'int': int,
                'float': float,
                'json': json.loads,
            }[_type.lower()](value)
        _kwargs[kwarg.key] = value
    return _kwargs

def build_chat_model(
    model: str,
    api_key: str,
    base_url: Optional[str] = None,
    model_provider: Optional[str] = None,
    **kwargs,
) -> BaseChatModel:
    return init_chat_model(
        model,
        model_provider=model_provider if model_provider else None,
        api_key=api_key,
        base_url=base_url if base_url else None,
        **kwargs,
    )

def invoke(
    model: BaseChatModel,
    messages: List[MessagesItems],
):
    _messages = prompt_template.invoke({
        'messages': [
            (msg.role, msg.content)
            for msg in messages
        ]
    }).to_messages()
    return model.invoke(
        _messages,
    )

def handler(args: Args[Input])->Output:
    cfg = {}
    if args.input.temperature:
        cfg['temperature'] = args.input.temperature
    if args.input.max_tokens:
        cfg['max_tokens'] = args.input.max_tokens
    model = build_chat_model(
        model=args.input.model,
        model_provider=args.input.model_provider,
        api_key=args.input.api_key,
        base_url=args.input.base_url,
        **cfg,
        **parse_kwargs(args.input.kwargs),
    )
    result = invoke(
        model,
        args.input.messages,
    )
    ai_response = str(result.content)
    return {
        'content': ai_response,
        'messages': [
            *[
                {
                    'id': msg.id,
                    'name': msg.name,
                    'role': msg.role,
                    'content': msg.content,
                }
                for msg in args.input.messages
            ],
            {
                'id': result.id,
                'name': result.name,
                'role': 'assistant',
                'content': ai_response,
            }
        ]
    }