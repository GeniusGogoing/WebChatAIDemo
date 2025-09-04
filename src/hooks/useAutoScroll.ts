import { useRef, useEffect, useCallback, useState } from 'react';

interface UseAutoScrollOptions {
  /**
   * 是否启用自动滚动
   */
  enabled?: boolean;
  /**
   * 滚动行为，默认为 'smooth'
   */
  behavior?: ScrollBehavior;
  /**
   * 滚动到顶部的阈值，当用户滚动超过此距离时暂停自动滚动
   */
  threshold?: number;
}

interface UseAutoScrollReturn {
  /**
   * 滚动容器的 ref
   */
  scrollRef: React.RefObject<HTMLElement | null>;
  /**
   * 是否应该自动滚动
   */
  shouldAutoScroll: boolean;
  /**
   * 手动滚动到底部
   */
  scrollToBottom: () => void;
  /**
   * 重置自动滚动状态（用户发送新消息时调用）
   */
  resetAutoScroll: () => void;
}

export function useAutoScroll(options: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const {
    behavior = 'smooth',
    threshold = 100
  } = options;

  const scrollRef = useRef<HTMLElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) {
      console.log('❌ scrollRef.current 为空');
      return;
    }
    
    if (!shouldAutoScroll) {
      console.log('❌ shouldAutoScroll 为 false，跳过滚动');
      return;
    }
    
    console.log('✅ 执行自动滚动到底部');
    const element = scrollRef.current;
    element.scrollTo({
      top: element.scrollHeight,
      behavior
    });
  }, [shouldAutoScroll, behavior]);

  // 重置自动滚动状态
  const resetAutoScroll = useCallback(() => {
    console.log('🔄 重置自动滚动状态');
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    // 清除定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  // 检测用户滚动
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    const { scrollTop, scrollHeight, clientHeight } = element;
    
    // 计算距离底部的距离
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 如果用户滚动到距离底部超过阈值，暂停自动滚动
    if (distanceFromBottom > threshold) {
      if (shouldAutoScroll) {
        console.log('🚫 用户向上滚动，暂停自动滚动', { distanceFromBottom, threshold });
        setShouldAutoScroll(false);
        setIsUserScrolling(true);
      }
      
      // 设置定时器，如果用户停止滚动一段时间，恢复自动滚动
      scrollTimeoutRef.current = setTimeout(() => {
        // 重新计算距离，确保用户确实在底部附近
        const currentDistance = scrollHeight - element.scrollTop - element.clientHeight;
        if (currentDistance <= threshold && !shouldAutoScroll) {
          console.log('✅ 用户回到底部，恢复自动滚动', { currentDistance, threshold });
          setShouldAutoScroll(true);
          setIsUserScrolling(false);
        }
      }, 2000); // 增加延迟时间到 2 秒，避免频繁切换
    } else {
      // 如果用户滚动回底部附近，立即恢复自动滚动
      if (!shouldAutoScroll) {
        console.log('✅ 用户回到底部附近，恢复自动滚动', { distanceFromBottom, threshold });
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
      }
    }
  }, [threshold, shouldAutoScroll]);

  // 绑定滚动事件，使用节流来减少频繁触发
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    let isScrolling = false;
    const throttledHandleScroll = () => {
      if (!isScrolling) {
        requestAnimationFrame(() => {
          handleScroll();
          isScrolling = false;
        });
        isScrolling = true;
      }
    };

    element.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', throttledHandleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // 移除这个 useEffect，避免循环触发
  // 滚动逻辑由外部组件控制

  return {
    scrollRef,
    shouldAutoScroll,
    scrollToBottom,
    resetAutoScroll
  };
}
